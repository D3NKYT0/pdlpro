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

Sem --path, usa o backup .dump mais recente de backups/db.

Opções:
  --path FILE  Arquivo .dump a restaurar.
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
  backup_path="$(find "${ROOT_DIR}/backups/db" -maxdepth 1 -type f -name '*.dump' -print 2>/dev/null | LC_ALL=C sort | tail -n 1)"
  [[ -n "$backup_path" ]] || die "nenhum backup .dump encontrado em ${ROOT_DIR}/backups/db"
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

ensure_database_running
compose exec -T db sh -c 'exec pg_restore --list' < "$backup_path" >/dev/null || die "arquivo de backup inválido"

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
    compose up -d "${services_to_restart[@]}"
  fi
}
trap restart_services EXIT

if [[ ${#services_to_restart[@]} -gt 0 ]]; then
  info "Pausando serviços da aplicação durante a restauração..."
  compose stop "${services_to_restart[@]}"
fi

info "Restaurando $backup_path..."
compose exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --exit-on-error' < "$backup_path"

restart_services
trap - EXIT
success "Restauração concluída."
