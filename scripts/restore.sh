#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/backup.sh
source "${SCRIPT_DIR}/lib/backup.sh"

show_help() {
  cat <<'EOF'
Restaura um backup criado pelo comando backup (local ou da nuvem).

Uso:
  ./setup.sh restore [--path ARQUIVO | --from-cloud [NOME]] [--db-only] [--force]

Sem --path nem --from-cloud, usa o backup mais recente de backups/db
(ou PDL_BACKUP_DIR).

Opções:
  --path FILE         Arquivo .tar.enc, .tar, .dump.enc ou .dump a restaurar.
  --from-cloud [NOME] Baixa de BACKUP_REMOTE o backup NOME (padrão: o mais recente).
  --db-only           Restaura só o PostgreSQL, mesmo que o pacote tenha arquivos.
  --force             Não pede confirmação interativa.
  -h, --help          Exibe esta ajuda.

Pacotes .tar(.enc) restauram o banco e substituem /app/media e /app/private
pelo conteúdo do backup. Arquivos .dump(.enc) restauram só o banco.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Restaura banco e arquivos a partir de um backup local ou da nuvem'
  exit 0
fi

backup_path=""
from_cloud=0
cloud_name=""
db_only=0
force=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --path)
      [[ $# -ge 2 ]] || die "--path exige um arquivo"
      backup_path="$2"
      shift
      ;;
    --from-cloud)
      from_cloud=1
      if [[ $# -ge 2 && "$2" != -* ]]; then
        cloud_name="$2"
        shift
      fi
      ;;
    --db-only) db_only=1 ;;
    --force) force=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para restore: $1" ;;
  esac
  shift
done

[[ -z "$backup_path" || "$from_cloud" -eq 0 ]] || die "use --path ou --from-cloud, não os dois"

require_project_files
require_docker
ensure_env_file

local_dir="$(backup_dir)"
mkdir -p "$local_dir"
local_dir="$(cd "$local_dir" && pwd)"
acquire_backup_lock "$local_dir"
work_dir="$(mktemp -d "${local_dir}/.restore.XXXXXX")"
services_to_restart=()

restart_services() {
  if [[ ${#services_to_restart[@]} -gt 0 ]]; then
    info "Reiniciando serviços da aplicação..."
    operational_compose up -d "${services_to_restart[@]}"
    services_to_restart=()
  fi
}
finish_restore() {
  restart_services
  rm -rf -- "$work_dir"
  release_backup_lock
}
trap finish_restore EXIT

if [[ "$from_cloud" -eq 1 ]]; then
  remote="$(backup_remote)"
  [[ -n "$remote" ]] || die "BACKUP_REMOTE não está configurado; rode ./setup.sh backup-cloud configure"
  if [[ -z "$cloud_name" ]]; then
    cloud_name="$(rclone_run lsf --files-only "$remote" | backup_primary_names | LC_ALL=C sort | tail -n 1)"
    [[ -n "$cloud_name" ]] || die "nenhum backup encontrado em ${remote}"
  fi
  [[ "$cloud_name" =~ $BACKUP_NAME_PATTERN ]] || die "nome de backup inválido: $cloud_name"
  info "Baixando ${cloud_name} de ${remote}..."
  rclone_run copyto "$(remote_join "$remote" "$cloud_name")" "${work_dir}/${cloud_name}"
  rclone_run copyto "$(remote_join "$remote" "${cloud_name}.sha256")" "${work_dir}/${cloud_name}.sha256" ||
    die "checksum ausente na nuvem para ${cloud_name}"
  mv -f -- "${work_dir}/${cloud_name}" "${local_dir}/${cloud_name}"
  mv -f -- "${work_dir}/${cloud_name}.sha256" "${local_dir}/${cloud_name}.sha256"
  backup_path="${local_dir}/${cloud_name}"
  verify_backup_checksum "$backup_path" 1
else
  if [[ -z "$backup_path" ]]; then
    latest="$(find "$local_dir" -maxdepth 1 -type f -name 'pdl_*' -exec basename {} \; |
      backup_primary_names | LC_ALL=C sort | tail -n 1)"
    [[ -n "$latest" ]] || die "nenhum backup encontrado em ${local_dir}"
    backup_path="${local_dir}/${latest}"
  fi
  [[ -f "$backup_path" ]] || die "arquivo de backup não encontrado: $backup_path"
  backup_path="$(cd "$(dirname "$backup_path")" && pwd)/$(basename "$backup_path")"
  verify_backup_checksum "$backup_path"
fi

plain_path="$backup_path"
if backup_is_encrypted "$backup_path"; then
  plain_path="${work_dir}/decrypted"
  decrypt_backup_file "$backup_path" "$plain_path"
  info "Backup cifrado decifrado para restauração."
fi

db_dump="$plain_path"
files_archive=""
restore_name="$(basename "$backup_path")"
restore_name="${restore_name%.enc}"
if [[ "$restore_name" == *.tar ]]; then
  mkdir -p "${work_dir}/bundle"
  tar -xf "$plain_path" -C "${work_dir}/bundle" || die "pacote de backup inválido"
  grep -Fxq "format=${BACKUP_FORMAT}" "${work_dir}/bundle/manifest.txt" 2>/dev/null ||
    die "pacote de backup sem manifesto compatível (${BACKUP_FORMAT})"
  db_dump="${work_dir}/bundle/db.dump"
  [[ -s "$db_dump" ]] || die "o pacote não contém db.dump"
  if [[ -f "${work_dir}/bundle/files.tar.gz" ]]; then
    files_archive="${work_dir}/bundle/files.tar.gz"
    tar -tzf "$files_archive" >/dev/null || die "o pacote de arquivos do backup está corrompido"
  fi
fi

ensure_database_running
operational_compose exec -T db sh -c 'exec pg_restore --list' < "$db_dump" >/dev/null || die "arquivo de backup inválido"

restore_files=0
if [[ -n "$files_archive" && "$db_only" -eq 0 ]]; then
  restore_files=1
fi

if [[ "$force" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    die "a restauração é destrutiva; use --force em execução não interativa"
  fi
  if [[ "$restore_files" -eq 1 ]]; then
    printf 'A restauração substituirá o banco, a mídia e os arquivos privados atuais. Continuar? [s/N] '
  else
    printf 'A restauração substituirá os dados atuais do banco. Continuar? [s/N] '
  fi
  read -r answer
  [[ "$answer" =~ ^[sS]$ ]] || die "restauração cancelada"
fi

for service in backend asgi celery_worker; do
  if service_is_running "$service"; then
    services_to_restart+=("$service")
  fi
done
if [[ ${#services_to_restart[@]} -gt 0 ]]; then
  info "Pausando serviços da aplicação durante a restauração..."
  operational_compose stop "${services_to_restart[@]}"
fi

info "Restaurando o banco de $(basename "$backup_path")..."
operational_compose exec -T db sh -c 'exec pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-privileges --exit-on-error' < "$db_dump"

if [[ "$restore_files" -eq 1 ]]; then
  file_dirs=()
  while IFS= read -r dir; do
    [[ "$dir" == "media" || "$dir" == "private" ]] && file_dirs+=("$dir")
  done < <(tar -tzf "$files_archive" | cut -d/ -f1 | LC_ALL=C sort -u)
  [[ ${#file_dirs[@]} -gt 0 ]] || die "o pacote de arquivos não contém media/ nem private/"
  info "Restaurando ${file_dirs[*]}..."
  files_container "$FILES_RESTORE_SCRIPT" "${file_dirs[@]}" < "$files_archive"
elif [[ -n "$files_archive" ]]; then
  info "--db-only: mídia e arquivos privados atuais foram mantidos."
fi

restart_services
success "Restauração concluída."
