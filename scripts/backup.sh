#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Cria um backup PostgreSQL em formato custom do pg_dump.

Uso:
  ./setup.sh backup [--output-dir DIRETÓRIO]

Opções:
  --output-dir DIR  Diretório de destino (padrão: backups/db).
  -h, --help        Exibe esta ajuda.

Em produção o dump é cifrado com AES-256 (openssl) usando BACKUP_ENCRYPTION_KEY.
O arquivo final termina em .dump.enc. Sem a chave, o desenvolvimento grava o
.dump em claro e emite um aviso.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Cria um backup verificável do PostgreSQL'
  exit 0
fi

output_dir="${ROOT_DIR}/backups/db"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      [[ $# -ge 2 ]] || die "--output-dir exige um diretório"
      output_dir="$2"
      shift
      ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para backup: $1" ;;
  esac
  shift
done

require_project_files
require_docker
ensure_env_file
ensure_database_running

mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd)"
timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"
plaintext_path="${output_dir}/pdl_${timestamp}.dump"
temporary_path="${plaintext_path}.partial"
backup_encryption_key="$(read_env_value BACKUP_ENCRYPTION_KEY)"
settings_module="$(read_env_value DJANGO_SETTINGS_MODULE)"

cleanup() {
  rm -f -- "$temporary_path"
}
trap cleanup EXIT

info "Criando backup em ${plaintext_path}..."
operational_compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > "$temporary_path"

[[ -s "$temporary_path" ]] || die "o backup gerado está vazio"
operational_compose exec -T db sh -c 'exec pg_restore --list' < "$temporary_path" >/dev/null

if [[ -z "$backup_encryption_key" ]]; then
  if [[ "$settings_module" == *production* ]]; then
    die "BACKUP_ENCRYPTION_KEY é obrigatória para cifrar backups em produção"
  fi
  warn "BACKUP_ENCRYPTION_KEY vazia; o dump será gravado sem cifra (somente desenvolvimento)"
  mv -- "$temporary_path" "$plaintext_path"
  backup_path="$plaintext_path"
else
  command -v openssl >/dev/null 2>&1 || die "openssl é necessário para cifrar o backup"
  backup_path="${plaintext_path}.enc"
  BACKUP_ENCRYPTION_KEY="$backup_encryption_key"
  export BACKUP_ENCRYPTION_KEY
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
    -in "$temporary_path" -out "$backup_path" \
    -pass env:BACKUP_ENCRYPTION_KEY
  rm -f -- "$temporary_path"
  unset BACKUP_ENCRYPTION_KEY backup_encryption_key
  info "Dump cifrado com AES-256: $backup_path"
fi

if checksum="$(sha256_file "$backup_path")"; then
  printf '%s  %s\n' "$checksum" "$(basename "$backup_path")" > "${backup_path}.sha256"
else
  warn "nenhum utilitário SHA-256 encontrado; checksum não foi criado"
fi

trap - EXIT
success "Backup criado e validado: $backup_path"
