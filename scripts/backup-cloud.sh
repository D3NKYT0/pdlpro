#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/backup.sh
source "${SCRIPT_DIR}/lib/backup.sh"

readonly RCLONE_SECTION="pdl-backup"
readonly CRON_MARKER="# pdl-backup ${ROOT_DIR}"

show_help() {
  cat <<'EOF'
Configura o destino na nuvem, o agendamento e a consulta dos backups (rclone).

Uso:
  ./setup.sh backup-cloud configure [--remote REMOTE]
  ./setup.sh backup-cloud configure --provider r2|s3 --bucket BUCKET
                                    --access-key-id ID [--secret-access-key KEY]
                                    [--endpoint URL] [--region REGIAO] [--prefix PASTA]
  ./setup.sh backup-cloud test
  ./setup.sh backup-cloud list
  ./setup.sh backup-cloud schedule [--time HH:MM]
  ./setup.sh backup-cloud unschedule
  ./setup.sh backup-cloud status

configure sem --provider abre o assistente do rclone (Google Drive, OneDrive,
Dropbox, Backblaze B2, SFTP, WebDAV, S3 compatíveis...) e grava BACKUP_REMOTE,
por exemplo gdrive:pdl-backups. Com --provider r2|s3 o remote "pdl-backup" é
criado sem assistente; a chave secreta pode vir de PDL_BACKUP_SECRET_ACCESS_KEY
ou ser digitada, para não ficar no histórico do shell.

schedule instala um timer systemd (ou, sem systemd, uma linha no crontab) que
roda ./setup.sh backup todo dia no horário de BACKUP_SCHEDULE_TIME (03:30).

O rclone do host é usado quando instalado; senão, a imagem rclone/rclone via
Docker. A configuração fica em .rclone/rclone.conf (ou PDL_RCLONE_CONFIG).
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Backup na nuvem (Drive, R2/S3...): destino, agendamento e lista'
  exit 0
fi

subcommand="${1:-}"
[[ -n "$subcommand" ]] || { show_help; exit 1; }
shift
case "$subcommand" in
  -h|--help|help) show_help; exit 0 ;;
esac

ensure_env_file

require_remote() {
  local remote
  remote="$(backup_remote)"
  [[ -n "$remote" ]] || die "BACKUP_REMOTE não está configurado; rode ./setup.sh backup-cloud configure"
  printf '%s' "$remote"
}

# Grava (ou substitui) uma seção do rclone.conf sem passar segredos por argv.
write_rclone_section() {
  local section="$1"
  shift
  local config temporary
  config="$(rclone_config_path)"
  mkdir -p "$(dirname "$config")"
  chmod 700 "$(dirname "$config")" 2>/dev/null || true
  touch "$config"
  temporary="$(mktemp "${config}.tmp.XXXXXX")"
  awk -v section="[$section]" '
    /^\[/ { skip = ($0 == section) }
    !skip { print }
  ' "$config" > "$temporary"
  {
    printf '\n[%s]\n' "$section"
    local pair
    for pair in "$@"; do
      printf '%s = %s\n' "${pair%%=*}" "${pair#*=}"
    done
  } >> "$temporary"
  chmod 600 "$temporary"
  mv -f -- "$temporary" "$config"
}

cloud_test() {
  local remote probe_name probe_dir
  remote="$(require_remote)"
  probe_dir="$(backup_dir)"
  mkdir -p "$probe_dir"
  probe_name=".pdl-cloud-test-$(date -u +'%Y%m%dT%H%M%SZ')"
  printf 'PDL PRO backup probe\n' > "${probe_dir}/${probe_name}"
  info "Testando escrita, listagem e remoção em ${remote}..."
  local status=0
  if ! rclone_run copyto "${probe_dir}/${probe_name}" "$(remote_join "$remote" "$probe_name")"; then
    status=1
  elif ! rclone_run lsf --files-only "$remote" | grep -Fxq "$probe_name"; then
    status=1
  elif ! rclone_run deletefile "$(remote_join "$remote" "$probe_name")"; then
    status=1
  fi
  rm -f -- "${probe_dir}/${probe_name}"
  [[ "$status" -eq 0 ]] || die "o destino ${remote} não aceitou escrita, listagem ou remoção"
  success "Destino ${remote} pronto para receber backups."
}

cloud_configure() {
  local remote="" provider="" bucket="" access_key="" secret_key="" endpoint="" region="" prefix=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --remote) [[ $# -ge 2 ]] || die "--remote exige um valor"; remote="$2"; shift ;;
      --provider) [[ $# -ge 2 ]] || die "--provider exige r2 ou s3"; provider="$2"; shift ;;
      --bucket) [[ $# -ge 2 ]] || die "--bucket exige um valor"; bucket="$2"; shift ;;
      --access-key-id) [[ $# -ge 2 ]] || die "--access-key-id exige um valor"; access_key="$2"; shift ;;
      --secret-access-key) [[ $# -ge 2 ]] || die "--secret-access-key exige um valor"; secret_key="$2"; shift ;;
      --endpoint) [[ $# -ge 2 ]] || die "--endpoint exige uma URL"; endpoint="$2"; shift ;;
      --region) [[ $# -ge 2 ]] || die "--region exige um valor"; region="$2"; shift ;;
      --prefix) [[ $# -ge 2 ]] || die "--prefix exige um valor"; prefix="$2"; shift ;;
      *) die "opção desconhecida para backup-cloud configure: $1" ;;
    esac
    shift
  done

  if [[ -n "$provider" ]]; then
    [[ "$provider" == "r2" || "$provider" == "s3" ]] || die "--provider aceita r2 ou s3 (outros provedores: configure sem --provider)"
    [[ -n "$bucket" ]] || die "--bucket é obrigatório com --provider"
    [[ -n "$access_key" ]] || die "--access-key-id é obrigatório com --provider"
    [[ -n "$secret_key" ]] || secret_key="${PDL_BACKUP_SECRET_ACCESS_KEY:-}"
    if [[ -z "$secret_key" ]]; then
      [[ -t 0 ]] || die "informe a chave secreta em PDL_BACKUP_SECRET_ACCESS_KEY ou --secret-access-key"
      printf 'Chave secreta de acesso (não aparece na tela): '
      read -rs secret_key
      printf '\n'
    fi
    [[ -n "$secret_key" ]] || die "a chave secreta de acesso é obrigatória"
    local settings=(type=s3 "access_key_id=${access_key}" "secret_access_key=${secret_key}" acl=private no_check_bucket=true)
    if [[ "$provider" == "r2" ]]; then
      [[ "$endpoint" == https://* ]] || die "--endpoint é obrigatório para R2 (https://<conta>.r2.cloudflarestorage.com)"
      settings+=(provider=Cloudflare "endpoint=${endpoint}" region=auto)
    elif [[ -n "$endpoint" ]]; then
      settings+=(provider=Other "endpoint=${endpoint}" "region=${region:-us-east-1}")
    else
      settings+=(provider=AWS "region=${region:-us-east-1}")
    fi
    write_rclone_section "$RCLONE_SECTION" "${settings[@]}"
    unset secret_key
    remote="${RCLONE_SECTION}:${bucket}"
    [[ -n "$prefix" ]] && remote="${remote}/${prefix#/}"
  else
    if [[ -z "$remote" ]]; then
      [[ -t 0 ]] || die "o assistente do rclone precisa de terminal; use --provider ou --remote"
      info "Abrindo o assistente do rclone. Crie um remote (ex.: gdrive) e volte aqui."
      rclone_run config
      remote="$(read_backup_destination "$(rclone_run listremotes 2>/dev/null | suggest_backup_destination)")" ||
        die "destino não informado; rode ./setup.sh backup-cloud configure --remote REMOTE:PASTA"
    fi
  fi

  [[ "$remote" == *:* ]] || die "BACKUP_REMOTE precisa ter o formato remote:caminho (recebido: $remote)"
  set_env_value BACKUP_REMOTE "$remote"
  success "BACKUP_REMOTE=${remote} gravado em ${ENV_FILE}"
  cloud_test
  warn "Guarde BACKUP_ENCRYPTION_KEY fora deste servidor (cofre de senhas): sem ela os backups da nuvem não podem ser restaurados."
}

cloud_list() {
  local remote names
  remote="$(require_remote)"
  names="$(rclone_run lsf --files-only "$remote" | backup_primary_names | LC_ALL=C sort -r)"
  if [[ -z "$names" ]]; then
    info "Nenhum backup em ${remote}."
    return 0
  fi
  info "Backups em ${remote} (mais recente primeiro):"
  printf '%s\n' "$names"
}

schedule_time() {
  local value="$1"
  [[ "$value" =~ ^([01][0-9]|2[0-3]):[0-5][0-9]$ ]] || die "horário inválido: $value (use HH:MM)"
  printf '%s' "$value"
}

detect_scheduler() {
  if [[ -n "${PDL_SCHEDULER:-}" ]]; then
    printf '%s' "$PDL_SCHEDULER"
  elif [[ -d /run/systemd/system ]] && command -v systemctl >/dev/null 2>&1 && [[ "$(id -u)" -eq 0 ]]; then
    printf 'systemd'
  elif command -v "${PDL_CRONTAB:-crontab}" >/dev/null 2>&1; then
    printf 'cron'
  else
    die "nem systemd (como root) nem crontab estão disponíveis para agendar o backup"
  fi
}

unit_name() {
  printf '%s' "${PDL_BACKUP_UNIT:-pdl-backup}"
}

systemd_dir() {
  printf '%s' "${PDL_SYSTEMD_DIR:-/etc/systemd/system}"
}

systemctl_run() {
  "${PDL_SYSTEMCTL:-systemctl}" "$@"
}

crontab_run() {
  "${PDL_CRONTAB:-crontab}" "$@"
}

current_crontab_without_pdl() {
  crontab_run -l 2>/dev/null | grep -Fv "$CRON_MARKER" || true
}

cloud_schedule() {
  local time=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --time) [[ $# -ge 2 ]] || die "--time exige HH:MM"; time="$2"; shift ;;
      *) die "opção desconhecida para backup-cloud schedule: $1" ;;
    esac
    shift
  done
  time="$(schedule_time "${time:-$(env_value_or BACKUP_SCHEDULE_TIME 03:30)}")"
  set_env_value BACKUP_SCHEDULE_TIME "$time"
  local hour="${time%%:*}"
  local minute="${time##*:}"
  local scheduler unit dir
  scheduler="$(detect_scheduler)"
  unit="$(unit_name)"

  if [[ "$scheduler" == "systemd" ]]; then
    dir="$(systemd_dir)"
    mkdir -p "$dir"
    cat > "${dir}/${unit}.service" <<EOF
[Unit]
Description=PDL PRO: backup do banco, mídia e envio para a nuvem
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
WorkingDirectory=${ROOT_DIR}
Environment=PDL_ENV_FILE=${ENV_FILE}
ExecStart=/usr/bin/env bash ${ROOT_DIR}/setup.sh backup
EOF
    cat > "${dir}/${unit}.timer" <<EOF
[Unit]
Description=PDL PRO: backup diário às ${time}

[Timer]
OnCalendar=*-*-* ${hour}:${minute}:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
EOF
    systemctl_run daemon-reload
    systemctl_run enable --now "${unit}.timer"
    success "Timer systemd ${unit}.timer ativo: backup diário às ${time} (fuso do servidor)."
    info "Logs: journalctl -u ${unit}.service"
  elif [[ "$scheduler" == "cron" ]]; then
    local logger_part=""
    command -v logger >/dev/null 2>&1 && logger_part=" 2>&1 | logger -t pdl-backup"
    {
      current_crontab_without_pdl
      printf "%d %d * * * cd '%s' && PDL_ENV_FILE='%s' bash ./setup.sh backup%s %s\n" \
        "$((10#$minute))" "$((10#$hour))" "$ROOT_DIR" "$ENV_FILE" "$logger_part" "$CRON_MARKER"
    } | crontab_run -
    success "Crontab atualizado: backup diário às ${time}."
  else
    die "agendador desconhecido: $scheduler"
  fi
}

cloud_unschedule() {
  local scheduler unit dir
  scheduler="$(detect_scheduler)"
  unit="$(unit_name)"
  if [[ "$scheduler" == "systemd" ]]; then
    dir="$(systemd_dir)"
    systemctl_run disable --now "${unit}.timer" || true
    rm -f -- "${dir}/${unit}.service" "${dir}/${unit}.timer"
    systemctl_run daemon-reload
    success "Agendamento systemd removido."
  else
    current_crontab_without_pdl | crontab_run -
    success "Agendamento removido do crontab."
  fi
}

cloud_status() {
  local remote local_dir latest scheduler unit
  remote="$(backup_remote)"
  local_dir="$(backup_dir)"
  printf 'Destino na nuvem : %s\n' "${remote:-não configurado}"
  printf 'Arquivos (mídia) : %s\n' "$(env_value_or BACKUP_INCLUDE_FILES true)"
  printf 'Retenção         : %s diários, %s semanais\n' \
    "$(env_value_or BACKUP_KEEP_DAILY 7)" "$(env_value_or BACKUP_KEEP_WEEKLY 4)"
  printf 'Horário          : %s\n' "$(env_value_or BACKUP_SCHEDULE_TIME 03:30)"
  latest="$(find "$local_dir" -maxdepth 1 -type f -name 'pdl_*' -exec basename {} \; 2>/dev/null |
    backup_primary_names | LC_ALL=C sort | tail -n 1)"
  printf 'Último local     : %s\n' "${latest:-nenhum}"
  if [[ -n "$remote" ]]; then
    latest="$(rclone_run lsf --files-only "$remote" 2>/dev/null | backup_primary_names | LC_ALL=C sort | tail -n 1 || true)"
    printf 'Último na nuvem  : %s\n' "${latest:-nenhum}"
  fi
  scheduler="$(detect_scheduler 2>/dev/null || printf 'indisponível')"
  unit="$(unit_name)"
  if [[ "$scheduler" == "systemd" ]]; then
    if systemctl_run is-enabled --quiet "${unit}.timer" 2>/dev/null; then
      printf 'Agendamento      : systemd (%s.timer ativo)\n' "$unit"
    else
      printf 'Agendamento      : não agendado\n'
    fi
  elif [[ "$scheduler" == "cron" ]] && crontab_run -l 2>/dev/null | grep -Fq "$CRON_MARKER"; then
    printf 'Agendamento      : crontab\n'
  else
    printf 'Agendamento      : não agendado\n'
  fi
}

case "$subcommand" in
  configure) cloud_configure "$@" ;;
  test) cloud_test ;;
  list) cloud_list ;;
  schedule) cloud_schedule "$@" ;;
  unschedule) cloud_unschedule ;;
  status) cloud_status ;;
  *) die "subcomando desconhecido para backup-cloud: $subcommand (veja ./setup.sh help backup-cloud)" ;;
esac
