#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/nginx.sh
source "${SCRIPT_DIR}/lib/nginx.sh"
# shellcheck source=lib/ftp.sh
source "${SCRIPT_DIR}/lib/ftp.sh"

show_help() {
  cat <<'EOF'
Instala o vsftpd e grava um único vsftpd.conf para o launcher.

Uso:
  ./setup.sh ftp
  ./setup.sh ftp --yes --password-file /root/ftp.secret
  ./setup.sh ftp --yes --http --domain launcher.painel.exemplo.com --ssl --email voce@painel.exemplo.com

Sem flags, pergunta diretório, usuário, senha e se publica a pasta no Nginx.

Opções:
  --dir PASTA            Pasta dos arquivos (padrão: /var/www/launcher).
  --user NOME            Usuário FTP sem login (padrão: launcher).
  --password-file ARQ    Senha em arquivo (recomendado com --yes). Sem isso, gera uma.
  --pasv-min N           Início da faixa passiva (padrão: 40000).
  --pasv-max N           Fim da faixa passiva (padrão: 50000).
  --banner TEXTO         Banner do servidor.
  --ftps                 Liga TLS no vsftpd (certificado em --ftps-cert/--ftps-key).
  --ftps-cert ARQ        Certificado PEM (padrão: snakeoil).
  --ftps-key ARQ         Chave PEM (padrão: snakeoil).
  --http                 Publica a mesma pasta com index no Nginx.
  --domain DOMINIO       Host HTTP do launcher (obrigatório com --http).
  --ssl                  Let's Encrypt no site HTTP (certbot --webroot).
  --email EMAIL          Contato do certificado.
  --no-email             Permite --ssl sem e-mail.
  --write-config ARQ     Só renderiza o vsftpd.conf.
  --write-http-config ARQ Só renderiza o site Nginx do launcher.
  --dry-run              Mostra as opções; não instala.
  -y, --yes              Não pergunta.
  -h, --help             Esta ajuda.

O arquivo do servidor fica em /etc/vsftpd.conf (template em scripts/ftp/).
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Instala o FTP do launcher e, se pedido, a listagem HTTP'
  exit 0
fi

prompt_value() {
  local label="$1"
  local current="$2"
  local typed=""
  if [[ -n "$current" ]]; then
    printf '%s [%s]: ' "$label" "$current"
  else
    printf '%s: ' "$label"
  fi
  read -r typed
  if [[ -n "$typed" ]]; then
    printf '%s' "$typed"
  else
    printf '%s' "$current"
  fi
}

prompt_secret() {
  local label="$1"
  local typed=""
  printf '%s: ' "$label"
  read -rs typed
  printf '\n' >&2
  printf '%s' "$typed"
}

prompt_yes() {
  local label="$1"
  local default_yes="$2"
  local typed=""
  if [[ "$default_yes" -eq 1 ]]; then
    printf '%s [S/n]: ' "$label"
  else
    printf '%s [s/N]: ' "$label"
  fi
  read -r typed
  typed="${typed,,}"
  if [[ -z "$typed" ]]; then
    [[ "$default_yes" -eq 1 ]]
    return
  fi
  [[ "$typed" =~ ^[sSyY]$ ]]
}

generate_ftp_password() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 16
    return
  fi
  od -An -N 16 -tx1 /dev/urandom | tr -d ' \n'
}

ftp_dir="/var/www/launcher"
ftp_user="launcher"
password_file=""
ftp_password=""
pasv_min="40000"
pasv_max="50000"
banner="PDL PRO launcher"
ftps=0
ftps_cert="/etc/ssl/certs/ssl-cert-snakeoil.pem"
ftps_key="/etc/ssl/private/ssl-cert-snakeoil.key"
setup_http=0
http_domain=""
setup_ssl=0
email=""
no_email=0
assume_yes=0
write_config=""
write_http_config=""
dry_run=0
generated_password=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dir)
      [[ $# -ge 2 ]] || die "--dir exige um caminho absoluto"
      ftp_dir="$2"
      shift
      ;;
    --user)
      [[ $# -ge 2 ]] || die "--user exige um nome"
      ftp_user="$2"
      shift
      ;;
    --password-file)
      [[ $# -ge 2 ]] || die "--password-file exige um arquivo"
      password_file="$2"
      shift
      ;;
    --pasv-min)
      [[ $# -ge 2 ]] || die "--pasv-min exige uma porta"
      pasv_min="$2"
      shift
      ;;
    --pasv-max)
      [[ $# -ge 2 ]] || die "--pasv-max exige uma porta"
      pasv_max="$2"
      shift
      ;;
    --banner)
      [[ $# -ge 2 ]] || die "--banner exige um texto"
      banner="$2"
      shift
      ;;
    --ftps) ftps=1 ;;
    --ftps-cert)
      [[ $# -ge 2 ]] || die "--ftps-cert exige um arquivo"
      ftps_cert="$2"
      shift
      ;;
    --ftps-key)
      [[ $# -ge 2 ]] || die "--ftps-key exige um arquivo"
      ftps_key="$2"
      shift
      ;;
    --http) setup_http=1 ;;
    --domain)
      [[ $# -ge 2 ]] || die "--domain exige um domínio"
      http_domain="$2"
      shift
      ;;
    --ssl) setup_ssl=1 ;;
    --email)
      [[ $# -ge 2 ]] || die "--email exige um endereço"
      email="$2"
      shift
      ;;
    --no-email) no_email=1 ;;
    --write-config)
      [[ $# -ge 2 ]] || die "--write-config exige um arquivo"
      write_config="$2"
      shift
      ;;
    --write-http-config)
      [[ $# -ge 2 ]] || die "--write-http-config exige um arquivo"
      write_http_config="$2"
      shift
      ;;
    --dry-run) dry_run=1 ;;
    -y|--yes) assume_yes=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para ftp: $1" ;;
  esac
  shift
done

if [[ -n "$password_file" ]]; then
  [[ -f "$password_file" ]] || die "arquivo de senha não encontrado: $password_file"
  ftp_password="$(tr -d '\r\n' < "$password_file")"
fi

if [[ "$assume_yes" -ne 1 && -z "$write_config" && -z "$write_http_config" && "$dry_run" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    die "execução não interativa exige --yes"
  fi
  printf '\nFTP do launcher (vsftpd) — um arquivo de configuração\n\n'
  ftp_dir="$(prompt_value "Pasta dos arquivos" "$ftp_dir")"
  ftp_user="$(prompt_value "Usuário FTP" "$ftp_user")"
  if [[ -z "$ftp_password" ]]; then
    local_pass="$(prompt_secret "Senha")"
    local_confirm="$(prompt_secret "Confirme a senha")"
    [[ "$local_pass" == "$local_confirm" ]] || die "as senhas não coincidem"
    ftp_password="$local_pass"
    unset local_pass local_confirm
  fi
  if [[ "$setup_http" -eq 0 ]]; then
    prompt_yes "Publicar a pasta no Nginx (index)?" 0 && setup_http=1
  fi
  if [[ "$setup_http" -eq 1 && -z "$http_domain" ]]; then
    http_domain="$(prompt_value "Domínio HTTP do launcher" "launcher.${DOMAIN:-painel.exemplo.com}")"
  fi
  if [[ "$setup_http" -eq 1 && "$setup_ssl" -eq 0 ]]; then
    prompt_yes "Emitir Let's Encrypt nesse domínio?" 1 && setup_ssl=1
  fi
  if [[ "$setup_ssl" -eq 1 && -z "$email" && "$no_email" -ne 1 ]]; then
    email="$(prompt_value "E-mail do certificado" "admin@${http_domain}")"
  fi
  prompt_yes "Continuar?" 1 || die "configuração cancelada"
fi

ftp_dir="${ftp_dir%/}"
ftp_user="${ftp_user,,}"
http_domain="${http_domain,,}"
banner="${banner//[$'\n\r']/}"

if [[ "$dry_run" -eq 1 ]]; then
  printf 'dir=%s\n' "$ftp_dir"
  printf 'user=%s\n' "$ftp_user"
  printf 'pasv=%s-%s\n' "$pasv_min" "$pasv_max"
  printf 'http=%s\n' "$setup_http"
  printf 'domain=%s\n' "$http_domain"
  printf 'ssl=%s\n' "$setup_ssl"
  printf 'ftps=%s\n' "$ftps"
  exit 0
fi

is_absolute_unix_path "$ftp_dir" || die "diretório inválido: $ftp_dir"
is_valid_ftp_user "$ftp_user" || die "usuário FTP inválido: $ftp_user"
is_valid_pasv_port "$pasv_min" || die "pasv-min inválido: $pasv_min"
is_valid_pasv_port "$pasv_max" || die "pasv-max inválido: $pasv_max"
(( pasv_min < pasv_max )) || die "pasv-min deve ser menor que pasv-max"
[[ -n "$banner" && ${#banner} -le 120 ]] || die "banner inválido"
if [[ "$setup_http" -eq 1 || -n "$write_http_config" ]]; then
  is_valid_proxy_domain "$http_domain" || die "domínio HTTP inválido: ${http_domain:-<vazio>}"
fi
if [[ "$setup_ssl" -eq 1 && -z "$email" && "$no_email" -ne 1 ]]; then
  die "--ssl exige --email ou --no-email"
fi
if [[ -n "$email" ]] && ! is_valid_proxy_email "$email"; then
  die "e-mail inválido: $email"
fi
if [[ -n "$ftp_password" && ${#ftp_password} -lt 8 ]]; then
  die "a senha FTP precisa ter pelo menos 8 caracteres"
fi

if [[ -n "$write_config" ]]; then
  render_vsftpd_conf "$ftp_user" "$ftp_dir" "$pasv_min" "$pasv_max" "$banner" \
    "$ftps" "$ftps_cert" "$ftps_key" > "$write_config"
  success "vsftpd.conf gravado em $write_config"
fi
if [[ -n "$write_http_config" ]]; then
  render_launcher_site "$http_domain" "$ftp_dir" "$NGINX_WEB_ROOT" "$setup_ssl" \
    > "$write_http_config"
  success "Site do launcher gravado em $write_http_config"
fi
if [[ -n "$write_config" || -n "$write_http_config" ]]; then
  unset ftp_password
  exit 0
fi

if [[ "${PDL_SKIP_SYSTEM:-0}" != "1" && "${EUID}" -ne 0 ]]; then
  if [[ -n "$ftp_password" && -z "$password_file" ]]; then
    password_file="$(mktemp "${TMPDIR:-/tmp}/pdl-ftp.XXXXXX")"
    printf '%s' "$ftp_password" > "$password_file"
    chmod 600 "$password_file"
  fi
  sudo_args=(--dir "$ftp_dir" --user "$ftp_user" --pasv-min "$pasv_min" --pasv-max "$pasv_max" --banner "$banner")
  [[ -n "$password_file" ]] && sudo_args+=(--password-file "$password_file")
  [[ "$ftps" -eq 1 ]] && sudo_args+=(--ftps --ftps-cert "$ftps_cert" --ftps-key "$ftps_key")
  [[ "$setup_http" -eq 1 ]] && sudo_args+=(--http --domain "$http_domain")
  [[ "$setup_ssl" -eq 1 ]] && sudo_args+=(--ssl)
  [[ -n "$email" ]] && sudo_args+=(--email "$email")
  [[ "$no_email" -eq 1 ]] && sudo_args+=(--no-email)
  [[ "$assume_yes" -eq 1 ]] && sudo_args+=(--yes)
  exec sudo --preserve-env=PDL_ENV_FILE,PDL_NGINX_ROOT,PDL_NGINX_WEB_ROOT,PDL_VSFTPD_CONF,PDL_FTP_TEMPLATE,PDL_LAUNCHER_TEMPLATE,PDL_SKIP_SYSTEM \
    bash "$0" "${sudo_args[@]}"
fi

if [[ "${PDL_SKIP_SYSTEM:-0}" == "1" ]]; then
  mkdir -p "$ftp_dir"
  render_vsftpd_conf "$ftp_user" "$ftp_dir" "$pasv_min" "$pasv_max" "$banner" \
    "$ftps" "$ftps_cert" "$ftps_key" > "$VSFTPD_CONF"
  if [[ "$setup_http" -eq 1 ]]; then
    mkdir -p "${NGINX_ROOT}/sites-available" "${NGINX_ROOT}/sites-enabled"
    render_launcher_site "$http_domain" "$ftp_dir" "$NGINX_WEB_ROOT" "$setup_ssl" \
      > "${NGINX_ROOT}/sites-available/pdlpro-launcher"
    ln -sfn "${NGINX_ROOT}/sites-available/pdlpro-launcher" \
      "${NGINX_ROOT}/sites-enabled/pdlpro-launcher"
  fi
  success "FTP preparado em ${ftp_dir} (PDL_SKIP_SYSTEM=1)"
  unset ftp_password
  exit 0
fi

if [[ -z "$ftp_password" ]]; then
  ftp_password="$(generate_ftp_password)"
  generated_password=1
fi
[[ ${#ftp_password} -ge 8 ]] || die "a senha FTP precisa ter pelo menos 8 caracteres"

command -v apt-get >/dev/null 2>&1 || die "./setup.sh ftp exige apt-get (Ubuntu/Debian)"
if ! command -v vsftpd >/dev/null 2>&1; then
  info "Instalando vsftpd..."
  apt-get update -qq
  apt-get install -y vsftpd
fi

mkdir -p "$ftp_dir" /var/run/vsftpd/empty
chmod 755 "$ftp_dir" /var/run/vsftpd/empty
if id "$ftp_user" >/dev/null 2>&1; then
  usermod -d "$ftp_dir" -s /usr/sbin/nologin "$ftp_user" || true
else
  useradd -d "$ftp_dir" -s /usr/sbin/nologin -M "$ftp_user"
fi
echo "${ftp_user}:${ftp_password}" | chpasswd
chown -R "${ftp_user}:${ftp_user}" "$ftp_dir"
chmod 755 "$ftp_dir"

if [[ -f "$VSFTPD_CONF" && ! -f "${VSFTPD_CONF}.pdlpro.bak" ]]; then
  cp -- "$VSFTPD_CONF" "${VSFTPD_CONF}.pdlpro.bak"
fi
render_vsftpd_conf "$ftp_user" "$ftp_dir" "$pasv_min" "$pasv_max" "$banner" \
  "$ftps" "$ftps_cert" "$ftps_key" > "$VSFTPD_CONF"
if systemctl list-unit-files vsftpd.socket >/dev/null 2>&1; then
  systemctl stop vsftpd.socket 2>/dev/null || true
  systemctl disable vsftpd.socket 2>/dev/null || true
fi
systemctl enable vsftpd
systemctl restart vsftpd
systemctl is-active --quiet vsftpd || die "vsftpd não ficou ativo; veja journalctl -u vsftpd"

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow 21/tcp comment "PDL PRO FTP"
  ufw allow "${pasv_min}:${pasv_max}/tcp" comment "PDL PRO FTP passive"
fi

if [[ "$setup_http" -eq 1 ]]; then
  if ! command -v nginx >/dev/null 2>&1; then
    info "Nginx ausente; instale o proxy do painel com ./setup.sh nginx ou o pacote nginx"
    apt-get update -qq
    apt-get install -y nginx
  fi
  ensure_nginx_site_layout
  ensure_nginx_sites_include
  render_launcher_site "$http_domain" "$ftp_dir" "$NGINX_WEB_ROOT" 0 \
    > "${NGINX_ROOT}/sites-available/pdlpro-launcher"
  ln -sfn "${NGINX_ROOT}/sites-available/pdlpro-launcher" \
    "${NGINX_ROOT}/sites-enabled/pdlpro-launcher"
  nginx -t
  systemctl reload nginx || systemctl restart nginx
  if [[ "$setup_ssl" -eq 1 ]]; then
    if ! command -v certbot >/dev/null 2>&1; then
      apt-get update -qq
      apt-get install -y certbot
    fi
    certbot_args=(certonly --webroot -w "$NGINX_WEB_ROOT" -d "$http_domain" --non-interactive --agree-tos --keep-until-expiring)
    if [[ -n "$email" ]]; then
      certbot_args+=(--email "$email")
    else
      certbot_args+=(--register-unsafely-without-email)
    fi
    if certbot "${certbot_args[@]}"; then
      render_launcher_site "$http_domain" "$ftp_dir" "$NGINX_WEB_ROOT" 1 \
        > "${NGINX_ROOT}/sites-available/pdlpro-launcher"
      nginx -t
      systemctl reload nginx
    else
      warn "Certificado do launcher não emitido; a listagem segue em HTTP"
    fi
  fi
fi

success "FTP do launcher em ftp://${ftp_user}@<servidor> → ${ftp_dir}"
info "Arquivo: ${VSFTPD_CONF}  Portas passivas: ${pasv_min}-${pasv_max}"
if [[ "$generated_password" -eq 1 ]]; then
  warn "Senha gerada (não será mostrada de novo): ${ftp_password}"
fi
if [[ "$setup_http" -eq 1 ]]; then
  scheme="http"
  [[ "$setup_ssl" -eq 1 && -f "$(ssl_cert_path "$http_domain")" ]] && scheme="https"
  info "Listagem: ${scheme}://${http_domain}"
fi
unset ftp_password
