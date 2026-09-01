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
backup_path="${output_dir}/pdl_${timestamp}.dump"
temporary_path="${backup_path}.partial"

cleanup() {
  rm -f -- "$temporary_path"
}
trap cleanup EXIT

info "Criando backup em $backup_path..."
compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > "$temporary_path"

[[ -s "$temporary_path" ]] || die "o backup gerado está vazio"
compose exec -T db sh -c 'exec pg_restore --list' < "$temporary_path" >/dev/null
mv -- "$temporary_path" "$backup_path"

if checksum="$(sha256_file "$backup_path")"; then
  printf '%s  %s\n' "$checksum" "$(basename "$backup_path")" > "${backup_path}.sha256"
else
  warn "nenhum utilitário SHA-256 encontrado; checksum não foi criado"
fi

trap - EXIT
success "Backup criado e validado: $backup_path"
