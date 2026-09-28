#!/usr/bin/env bash
# Funções compartilhadas por backup.sh, restore.sh e backup-cloud.sh.
# Carregue scripts/lib/common.sh antes deste arquivo.

PDL_RCLONE_IMAGE="${PDL_RCLONE_IMAGE:-rclone/rclone:1.68.2}"
readonly BACKUP_NAME_PATTERN='^pdl_[0-9]{8}T[0-9]{6}Z\.(tar|dump)(\.enc)?$'
readonly BACKUP_FORMAT='pdl-backup/1'

# Executado dentro do container backend (sh do Debian): empacota mídia e privados.
# shellcheck disable=SC2016
readonly FILES_ARCHIVE_SCRIPT='set -e
cd /app
set --
for dir in media private; do
  [ -d "$dir" ] && set -- "$@" "$dir"
done
[ "$#" -gt 0 ] || { echo "nenhum diretório de arquivos encontrado em /app" >&2; exit 3; }
exec tar --numeric-owner -czf - "$@"'

# Recebe o tar.gz no stdin e os diretórios presentes nele como argumentos.
# shellcheck disable=SC2016
readonly FILES_RESTORE_SCRIPT='set -e
cd /app
for dir in "$@"; do
  mkdir -p "$dir"
  find "$dir" -mindepth 1 -delete
done
tar --numeric-owner -xzf -'

backup_dir() {
  printf '%s' "${PDL_BACKUP_DIR:-${ROOT_DIR}/backups/db}"
}

rclone_config_path() {
  printf '%s' "${PDL_RCLONE_CONFIG:-${ROOT_DIR}/.rclone/rclone.conf}"
}

env_value_or() {
  local value
  value="$(read_env_value "$1")"
  printf '%s' "${value:-$2}"
}

env_flag_enabled() {
  local value
  value="$(env_value_or "$1" "$2" | tr '[:upper:]' '[:lower:]')"
  [[ "$value" == "1" || "$value" == "true" || "$value" == "yes" || "$value" == "on" ]]
}

# rclone do host quando instalado; senão a imagem oficial, montando o diretório de
# backups no mesmo caminho para que os argumentos de arquivo continuem válidos.
rclone_run() {
  local config config_dir work_dir
  config="$(rclone_config_path)"
  config_dir="$(dirname "$config")"
  mkdir -p "$config_dir"
  chmod 700 "$config_dir" 2>/dev/null || true

  if [[ -n "${PDL_RCLONE_BIN:-}" ]] || command -v rclone >/dev/null 2>&1; then
    "${PDL_RCLONE_BIN:-rclone}" --config "$config" "$@"
    return
  fi

  require_docker
  work_dir="$(backup_dir)"
  mkdir -p "$work_dir"
  local tty_args=(-i)
  if [[ -t 0 && -t 1 ]]; then
    tty_args=(-it)
  fi
  docker run --rm "${tty_args[@]}" \
    --user "$(id -u):$(id -g)" \
    -e RCLONE_CONFIG=/config/rclone/rclone.conf \
    -e XDG_CACHE_HOME=/tmp \
    -v "${config_dir}:/config/rclone" \
    -v "${work_dir}:${work_dir}" \
    "$PDL_RCLONE_IMAGE" "$@"
}

remote_join() {
  local base="$1"
  local name="$2"
  if [[ "$base" == *: ]]; then
    printf '%s%s' "$base" "$name"
  else
    printf '%s/%s' "${base%/}" "$name"
  fi
}

backup_remote() {
  read_env_value BACKUP_REMOTE
}

backup_primary_names() {
  grep -E "$BACKUP_NAME_PATTERN" || true
}

backup_retention_value() {
  local key="$1"
  local fallback="$2"
  local minimum="$3"
  local value
  value="$(env_value_or "$key" "$fallback")"
  [[ "$value" =~ ^[0-9]+$ ]] || die "$key precisa ser um número inteiro (atual: $value)"
  (( value >= minimum )) || die "$key precisa ser pelo menos $minimum"
  printf '%s' "$value"
}

# Lê nomes de backup (um por linha) e imprime os que saem da política: mantém o
# mais novo de cada um dos últimos KEEP_DAILY dias e de cada uma das últimas
# KEEP_WEEKLY semanas ISO (mesma semântica de --keep-daily/--keep-weekly do restic).
backup_prune_candidates() {
  local keep_daily="$1"
  local keep_weekly="$2"
  local name stamp day week keep
  local days=0
  local weeks=0
  local -A seen_day=()
  local -A seen_week=()

  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    stamp="${name#pdl_}"
    day="${stamp:0:8}"
    week="$(date -u -d "${day:0:4}-${day:4:2}-${day:6:2}" +%G%V)"
    keep=0
    if [[ -z "${seen_day[$day]:-}" ]]; then
      seen_day[$day]=1
      (( days < keep_daily )) && keep=1
      days=$((days + 1))
    fi
    if [[ -z "${seen_week[$week]:-}" ]]; then
      seen_week[$week]=1
      (( weeks < keep_weekly )) && keep=1
      weeks=$((weeks + 1))
    fi
    (( keep == 1 )) || printf '%s\n' "$name"
  done < <(backup_primary_names | LC_ALL=C sort -r)
}

# Trava por diretório (mkdir é atômico) com PID para detectar execuções mortas.
acquire_backup_lock() {
  local lock_dir="$1/.pdl-backup.lock"
  local owner
  mkdir -p "$1"
  if ! mkdir "$lock_dir" 2>/dev/null; then
    owner="$(cat "${lock_dir}/pid" 2>/dev/null || true)"
    if [[ -n "$owner" ]] && ! kill -0 "$owner" 2>/dev/null; then
      warn "removendo trava abandonada do processo $owner"
      rm -rf -- "$lock_dir"
      mkdir "$lock_dir" || die "não foi possível criar a trava $lock_dir"
    else
      die "outro backup ou restauração está em andamento (trava: $lock_dir)"
    fi
  fi
  printf '%s\n' "$$" > "${lock_dir}/pid"
  BACKUP_LOCK_DIR="$lock_dir"
}

release_backup_lock() {
  if [[ -n "${BACKUP_LOCK_DIR:-}" ]]; then
    rm -rf -- "$BACKUP_LOCK_DIR"
  fi
  BACKUP_LOCK_DIR=""
}

write_backup_checksum() {
  local path="$1"
  local checksum
  if checksum="$(sha256_file "$path")"; then
    printf '%s  %s\n' "$checksum" "$(basename "$path")" > "${path}.sha256"
  else
    warn "nenhum utilitário SHA-256 encontrado; checksum não foi criado"
  fi
}

# Com require=1 a ausência do .sha256 é erro (arquivos vindos da nuvem).
verify_backup_checksum() {
  local path="$1"
  local require="${2:-0}"
  local expected actual
  if [[ ! -f "${path}.sha256" ]]; then
    [[ "$require" -eq 1 ]] && die "checksum ausente para $(basename "$path")"
    warn "arquivo de checksum não encontrado: ${path}.sha256"
    return 0
  fi
  expected="$(awk '{print $1}' "${path}.sha256")"
  actual="$(sha256_file "$path")" || die "não foi possível calcular o SHA-256 do backup"
  [[ "$expected" == "$actual" ]] || die "checksum inválido; o backup pode estar corrompido"
  success "Checksum do backup validado."
}

backup_is_encrypted() {
  local path="$1"
  [[ "$path" == *.enc ]] || [[ "$(head -c 8 "$path" 2>/dev/null || true)" == "Salted__" ]]
}

encrypt_backup_file() {
  local source="$1"
  local target="$2"
  local key="$3"
  command -v openssl >/dev/null 2>&1 || die "openssl é necessário para cifrar o backup"
  BACKUP_ENCRYPTION_KEY="$key" openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt \
    -in "$source" -out "$target" \
    -pass env:BACKUP_ENCRYPTION_KEY
}

# Tenta BACKUP_ENCRYPTION_KEY e depois BACKUP_ENCRYPTION_KEY_FALLBACKS.
decrypt_backup_file() {
  local source="$1"
  local target="$2"
  local primary fallbacks candidates candidate
  primary="$(read_env_value BACKUP_ENCRYPTION_KEY)"
  fallbacks="$(read_env_value BACKUP_ENCRYPTION_KEY_FALLBACKS)"
  [[ -n "$primary" ]] || die "BACKUP_ENCRYPTION_KEY é necessária para decifrar $(basename "$source")"
  command -v openssl >/dev/null 2>&1 || die "openssl é necessário para decifrar o backup"
  candidates="$primary"
  [[ -n "$fallbacks" ]] && candidates="${candidates},${fallbacks}"
  local keys=()
  IFS=',' read -r -a keys <<< "$candidates"
  for candidate in "${keys[@]}"; do
    candidate="$(printf '%s' "$candidate" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
    [[ -n "$candidate" ]] || continue
    if BACKUP_ENCRYPTION_KEY="$candidate" openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 \
      -in "$source" -out "$target" \
      -pass env:BACKUP_ENCRYPTION_KEY 2>/dev/null; then
      return 0
    fi
  done
  die "não foi possível decifrar o backup com BACKUP_ENCRYPTION_KEY nem fallbacks"
}

# Roda um script sh no container backend como root, com os volumes de mídia e
# privados montados; funciona com o serviço parado e sem baixar imagem de novo.
files_container() {
  local script="$1"
  shift
  PDL_IMAGE_PULL_POLICY=missing operational_compose run --rm --no-deps -T \
    --user root --entrypoint sh backend -c "$script" sh "$@"
}
