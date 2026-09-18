#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Restaura um backup PostgreSQL criado pelo comando backup.

Uso:
  ./setup.sh restore [--path ARQUIVO] [--force]

Sem --path, usa o backup .dump.enc (ou .dump) mais recente de backups/db.

Opções:
  --path FILE  Arquivo .dump.enc ou .dump a restaurar.
  --force      Não pede confirmação interativa.
  -h, --help   Exibe esta ajuda.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Restaura o PostgreSQL a partir de um backup'
  exit 0
fi

backup_path=""
force=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)
      [[ $# -ge 2 ]] || die "--path exige um arquivo"
      backup_path="$2"
      shift
      ;;
    --force) force=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para restore: $1" ;;
  esac
  shift
done

require_project_files
require_docker
ensure_env_file

if [[ -z "$backup_path" ]]; then
  backup_path="$(find "${ROOT_DIR}/backups/db" -maxdepth 1 -type f \( -name '*.dump.enc' -o -name '*.dump' \) -print 2>/dev/null | LC_ALL=C sort | tail -n 1)"
  [[ -n "$backup_path" ]] || die "nenhum backup .dump.enc/.dump encontrado em ${ROOT_DIR}/backups/db"
fi

[[ -f "$backup_path" ]] || die "arquivo de backup não encontrado: $backup_path"
backup_path="$(cd "$(dirname "$backup_path")" && pwd)/$(basename "$backup_path")"

if [[ -f "${backup_path}.sha256" ]]; then
  expected_checksum="$(awk '{print $1}' "${backup_path}.sha256")"
  actual_checksum="$(sha256_file "$backup_path")" || die "não foi possível calcular o SHA-256 do backup"
  [[ "$expected_checksum" == "$actual_checksum" ]] || die "checksum inválido; o backup pode estar corrompido"
  success "Checksum do backup validado."
else
  warn "arquivo de checksum não encontrado: ${backup_path}.sha256"
fi

restore_source="$backup_path"
decrypted_temp=""
cleanup_decrypt() {
  [[ -n "$decrypted_temp" ]] && rm -f -- "$decrypted_temp"
  decrypted_temp=""
}

if [[ "$backup_path" == *.enc ]] || { [[ -f "$backup_path" ]] && [[ "$(head -c 8 "$backup_path" 2>/dev/null || true)" == "Salted__" ]]; }; then
  backup_encryption_key="$(read_env_value BACKUP_ENCRYPTION_KEY)"
  [[ -n "$backup_encryption_key" ]] || die "BACKUP_ENCRYPTION_KEY é necessária para decifrar $backup_path"
  command -v openssl >/dev/null 2>&1 || die "openssl é necessário para decifrar o backup"
  decrypted_temp="$(mktemp)"
  BACKUP_ENCRYPTION_KEY="$backup_encryption_key"
  export BACKUP_ENCRYPTION_KEY
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
    -in "$backup_path" -out "$decrypted_temp" \
    -pass env:BACKUP_ENCRYPTION_KEY
  unset BACKUP_ENCRYPTION_KEY backup_encryption_key
  restore_source="$decrypted_temp"
  info "Backup cifrado decifrado para restauração."
fi

ensure_database_running
operational_compose exec -T db sh -c 'exec pg_restore --list' < "$restore_source" >/dev/null || die "arquivo de backup inválido"

if [[ "$force" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    die "a restauração é destrutiva; use --force em execução não interativa"
  fi
  printf 'A restauração substituirá os dados atuais. Continuar? [s/N] '
  read -r answer
  [[ "$answer" =~ ^[sS]$ ]] || die "restauração cancelada"
fi

services_to_restart=()
for service in backend asgi celery_worker; do
  if service_is_running "$service"; then
    services_to_restart+=("$service")
  fi
done

restart_services() {
  if [[ ${#services_to_restart[@]} -gt 0 ]]; then
    info "Reiniciando serviços da aplicação..."
    operational_compose up -d "${services_to_restart[@]}"
  fi
}
finish_restore() {
  cleanup_decrypt
  restart_services
}
trap finish_restore EXIT

if [[ ${#services_to_restart[@]} -gt 0 ]]; then
  info "Pausando serviços da aplicação durante a restauração..."
  operational_compose stop "${services_to_restart[@]}"
fi

info "Restaurando $backup_path..."
operational_compose exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --exit-on-error' < "$restore_source"

restart_services
cleanup_decrypt
trap - EXIT
success "Restauração concluída."
