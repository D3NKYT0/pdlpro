#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/backup.sh
source "${SCRIPT_DIR}/lib/backup.sh"

show_help() {
  cat <<'EOF'
Cria um backup verificável do painel e, se configurado, envia para a nuvem.

Uso:
  ./setup.sh backup [--output-dir DIRETÓRIO] [--db-only] [--no-upload] [--no-prune]

Opções:
  --output-dir DIR  Diretório local (padrão: backups/db ou PDL_BACKUP_DIR).
  --db-only         Só o PostgreSQL, no formato .dump(.enc) anterior.
  --no-upload       Não envia para BACKUP_REMOTE nesta execução.
  --no-prune        Não aplica a retenção nesta execução.
  -h, --help        Exibe esta ajuda.

O pacote padrão pdl_<data>.tar(.enc) reúne o dump do PostgreSQL, a mídia
(/app/media, incluindo temas) e os arquivos privados (/app/private). Com
BACKUP_INCLUDE_FILES=false o comando volta a gravar só o dump.

Em produção o arquivo é cifrado com AES-256 (openssl) usando
BACKUP_ENCRYPTION_KEY. Sem a chave, o desenvolvimento grava em claro e emite um
aviso; backups em claro nunca são enviados para a nuvem.

Com BACKUP_REMOTE definido (./setup.sh backup-cloud configure), o arquivo e o
.sha256 são enviados pelo rclone. A retenção BACKUP_KEEP_DAILY /
BACKUP_KEEP_WEEKLY vale para a pasta local e para a nuvem.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Cria um backup verificável (banco, mídia e nuvem)'
  exit 0
fi

output_dir=""
db_only=0
upload=1
prune=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output-dir)
      [[ $# -ge 2 ]] || die "--output-dir exige um diretório"
      output_dir="$2"
      shift
      ;;
    --db-only) db_only=1 ;;
    --no-upload) upload=0 ;;
    --no-prune) prune=0 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para backup: $1" ;;
  esac
  shift
done

require_project_files
require_docker
ensure_env_file

[[ -n "$output_dir" ]] || output_dir="$(backup_dir)"
mkdir -p "$output_dir"
output_dir="$(cd "$output_dir" && pwd)"

keep_daily="$(backup_retention_value BACKUP_KEEP_DAILY 7 1)"
keep_weekly="$(backup_retention_value BACKUP_KEEP_WEEKLY 4 0)"
remote="$(backup_remote)"
backup_encryption_key="$(read_env_value BACKUP_ENCRYPTION_KEY)"
settings_module="$(read_env_value DJANGO_SETTINGS_MODULE)"
include_files=0
if [[ "$db_only" -eq 0 ]] && env_flag_enabled BACKUP_INCLUDE_FILES true; then
  include_files=1
fi

if [[ -z "$backup_encryption_key" && "$settings_module" == *production* ]]; then
  die "BACKUP_ENCRYPTION_KEY é obrigatória para cifrar backups em produção"
fi
if [[ -n "$remote" && "$upload" -eq 1 && -z "$backup_encryption_key" ]]; then
  die "defina BACKUP_ENCRYPTION_KEY antes de enviar backups para a nuvem (ou use --no-upload)"
fi

acquire_backup_lock "$output_dir"
work_dir="$(mktemp -d "${output_dir}/.work.XXXXXX")"
cleanup() {
  rm -rf -- "$work_dir"
  release_backup_lock
}
trap cleanup EXIT

ensure_database_running
timestamp="$(date -u +'%Y%m%dT%H%M%SZ')"

info "Exportando o PostgreSQL..."
operational_compose exec -T db sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > "${work_dir}/db.dump"
[[ -s "${work_dir}/db.dump" ]] || die "o dump gerado está vazio"
operational_compose exec -T db sh -c 'exec pg_restore --list' < "${work_dir}/db.dump" >/dev/null ||
  die "o dump gerado não passou na verificação do pg_restore"

if [[ "$include_files" -eq 1 ]]; then
  info "Empacotando mídia e arquivos privados..."
  files_container "$FILES_ARCHIVE_SCRIPT" > "${work_dir}/files.tar.gz"
  [[ -s "${work_dir}/files.tar.gz" ]] || die "o pacote de arquivos gerado está vazio"
  tar -tzf "${work_dir}/files.tar.gz" >/dev/null || die "o pacote de arquivos gerado está corrompido"
  {
    printf 'format=%s\n' "$BACKUP_FORMAT"
    printf 'created_at=%s\n' "$timestamp"
    printf 'product_version=%s\n' "$(read_product_version 2>/dev/null || printf 'desconhecida')"
    printf 'contents=db,files\n'
  } > "${work_dir}/manifest.txt"
  tar -cf "${work_dir}/bundle.tar" -C "$work_dir" manifest.txt db.dump files.tar.gz
  plain_path="${work_dir}/bundle.tar"
  base_name="pdl_${timestamp}.tar"
else
  plain_path="${work_dir}/db.dump"
  base_name="pdl_${timestamp}.dump"
fi

if [[ -z "$backup_encryption_key" ]]; then
  warn "BACKUP_ENCRYPTION_KEY vazia; o backup será gravado sem cifra (somente desenvolvimento)"
  backup_path="${output_dir}/${base_name}"
  mv -- "$plain_path" "$backup_path"
else
  backup_path="${output_dir}/${base_name}.enc"
  encrypt_backup_file "$plain_path" "$backup_path" "$backup_encryption_key"
  info "Backup cifrado com AES-256."
fi
unset backup_encryption_key
write_backup_checksum "$backup_path"
success "Backup criado e validado: $backup_path"

upload_failed=0
if [[ -n "$remote" && "$upload" -eq 1 ]]; then
  info "Enviando para ${remote}..."
  if rclone_run copyto "$backup_path" "$(remote_join "$remote" "$(basename "$backup_path")")" &&
    { [[ ! -f "${backup_path}.sha256" ]] ||
      rclone_run copyto "${backup_path}.sha256" "$(remote_join "$remote" "$(basename "$backup_path").sha256")"; }; then
    success "Backup enviado para a nuvem."
  else
    upload_failed=1
    warn "falha ao enviar para ${remote}; o backup local foi mantido"
  fi
fi

if [[ "$prune" -eq 1 ]]; then
  while IFS= read -r stale; do
    [[ -n "$stale" ]] || continue
    info "Retenção: removendo ${stale} local"
    rm -f -- "${output_dir}/${stale}" "${output_dir}/${stale}.sha256"
  done < <(find "$output_dir" -maxdepth 1 -type f -name 'pdl_*' -exec basename {} \; |
    backup_prune_candidates "$keep_daily" "$keep_weekly")

  if [[ -n "$remote" && "$upload" -eq 1 && "$upload_failed" -eq 0 ]]; then
    remote_names="$(rclone_run lsf --files-only "$remote")" || die "não foi possível listar ${remote} para aplicar a retenção"
    while IFS= read -r stale; do
      [[ -n "$stale" ]] || continue
      info "Retenção: removendo ${stale} da nuvem"
      rclone_run deletefile "$(remote_join "$remote" "$stale")"
      if grep -Fxq "${stale}.sha256" <<< "$remote_names"; then
        rclone_run deletefile "$(remote_join "$remote" "${stale}.sha256")"
      fi
    done < <(printf '%s\n' "$remote_names" | backup_prune_candidates "$keep_daily" "$keep_weekly")
  fi
fi

[[ "$upload_failed" -eq 0 ]] || die "backup local concluído, mas o envio para a nuvem falhou"
