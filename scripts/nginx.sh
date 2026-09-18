#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"
# shellcheck source=lib/nginx.sh
source "${SCRIPT_DIR}/lib/nginx.sh"

show_help() {
  cat <<'EOF'
Instala o Nginx da máquina e grava um único site com HTTP, HTTPS, WebSocket e ACME.

Uso:
  ./setup.sh nginx
  ./setup.sh nginx --yes --ssl --email voce@painel.exemplo.com

Sem flags, pergunta domínio, porta, SSL e e-mail. Com --yes usa o .env
(DOMAIN, APP_HTTP_PORT) e só pede certificado se passar --ssl.

Opções:
  --domain DOMINIO     Host público (padrão: DOMAIN do .env).
  --www                Inclui www.DOMINIO no mesmo certificado e server_name.
  --port PORTA         Porta do Compose (padrão: APP_HTTP_PORT ou 8080).
  --upstream HOST:PORT Destino (padrão: 127.0.0.1:PORTA).
  --ssl                Let's Encrypt (certbot certonly --webroot; não reescreve o site).
  --email EMAIL        Contato do certificado.
  --no-email           Permite --ssl sem e-mail.
  --channel CANAL      distro (padrão), stable ou mainline (nginx.org).
  --reinstall          Reinstala o pacote Nginx.
  --write-config ARQ   Só renderiza o site e encerra.
  --dry-run            Mostra domínio, upstream, ssl e canal; não instala.
  -y, --yes            Não pergunta.
  -h, --help           Esta ajuda.

O Compose continua em 8080. Este comando só expõe 80/443 no anfitrião.
O site fica em /etc/nginx/sites-available/pdlpro (template em scripts/nginx/).
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Instala o Nginx da máquina e configura o proxy HTTPS'
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

install_host_nginx() {
  local channel="$1"
  local reinstall="$2"
  command -v apt-get >/dev/null 2>&1 || die "./setup.sh nginx exige apt-get (Ubuntu/Debian)"
  if command -v nginx >/dev/null 2>&1 && [[ "$reinstall" -ne 1 ]]; then
    info "Nginx já instalado ($(nginx -v 2>&1 | tr -d '\n'))"
    return 0
  fi
  info "Instalando Nginx (${channel})..."
  apt-get update -qq
  apt-get install -y curl gnupg2 ca-certificates lsb-release apt-transport-https
  if command -v nginx >/dev/null 2>&1 && [[ "$reinstall" -eq 1 ]]; then
    apt-get remove -y nginx nginx-common nginx-full nginx-core || true
  fi
  if [[ "$channel" != "distro" ]]; then
    [[ -f /etc/os-release ]] || die "não foi possível detectar o sistema"
    # shellcheck disable=SC1091
    . /etc/os-release
    [[ "${ID:-}" == "ubuntu" || "${ID:-}" == "debian" ]] ||
      die "o canal ${channel} só está automatizado em Ubuntu/Debian"
    [[ -n "${VERSION_CODENAME:-}" ]] || die "VERSION_CODENAME ausente em /etc/os-release"
    mkdir -p /usr/share/keyrings
    if [[ ! -f /usr/share/keyrings/nginx-archive-keyring.gpg ]]; then
      curl -fsSL https://nginx.org/keys/nginx_signing.key |
        gpg --dearmor -o /usr/share/keyrings/nginx-archive-keyring.gpg
    fi
    repo_branch="nginx"
    [[ "$channel" == "mainline" ]] && repo_branch="mainline"
    printf 'deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] https://nginx.org/packages/%s/%s %s nginx\n' \
      "$repo_branch" "$ID" "$VERSION_CODENAME" >/etc/apt/sources.list.d/nginx.list
    apt-get update -qq
  fi
  apt-get install -y nginx
  systemctl enable nginx
  systemctl restart nginx
}

issue_certificate() {
  local domain="$1"
  local email="$2"
  local no_email="$3"
  local extra_name="$4"
  if ! command -v certbot >/dev/null 2>&1; then
    info "Instalando certbot..."
    apt-get update -qq
    apt-get install -y certbot
  fi
  local certbot_args=(certonly --webroot -w "$NGINX_WEB_ROOT" -d "$domain" --non-interactive --agree-tos --keep-until-expiring)
  [[ -n "$extra_name" ]] && certbot_args+=(-d "$extra_name")
  if [[ -n "$email" ]]; then
    certbot_args+=(--email "$email")
  else
    warn "Certbot sem e-mail. Prefira --email para avisos de renovação."
    certbot_args+=(--register-unsafely-without-email)
  fi
  info "Pedindo certificado para ${domain}${extra_name:+ e ${extra_name}}..."
  certbot "${certbot_args[@]}"
}

domain=""
www=0
http_port=""
upstream=""
setup_ssl=0
ssl_flag=0
email=""
no_email=0
channel="distro"
reinstall=0
assume_yes=0
write_config=""
dry_run=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      [[ $# -ge 2 ]] || die "--domain exige um domínio"
      domain="$2"
      shift
      ;;
    --www) www=1 ;;
    --port)
      [[ $# -ge 2 ]] || die "--port exige uma porta"
      http_port="$2"
      shift
      ;;
    --upstream)
      [[ $# -ge 2 ]] || die "--upstream exige host:porta"
      upstream="$2"
      shift
      ;;
    --ssl)
      setup_ssl=1
      ssl_flag=1
      ;;
    --email)
      [[ $# -ge 2 ]] || die "--email exige um endereço"
      email="$2"
      shift
      ;;
    --no-email) no_email=1 ;;
    --channel)
      [[ $# -ge 2 ]] || die "--channel exige distro, stable ou mainline"
      channel="$2"
      shift
      ;;
    --reinstall) reinstall=1 ;;
    --write-config)
      [[ $# -ge 2 ]] || die "--write-config exige um arquivo"
      write_config="$2"
      shift
      ;;
    --dry-run) dry_run=1 ;;
    -y|--yes) assume_yes=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para nginx: $1" ;;
  esac
  shift
done

[[ "$channel" == "distro" || "$channel" == "stable" || "$channel" == "mainline" ]] ||
  die "--channel deve ser distro, stable ou mainline"

[[ -f "$ENV_FILE" ]] && ensure_env_file
if [[ -z "$domain" && -f "$ENV_FILE" ]]; then
  domain="$(read_env_value DOMAIN)"
fi
if [[ -z "$http_port" && -f "$ENV_FILE" ]]; then
  http_port="$(read_env_value APP_HTTP_PORT)"
fi
http_port="${http_port:-8080}"
domain="${domain,,}"

if [[ "$assume_yes" -ne 1 && -z "$write_config" && "$dry_run" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    die "execução não interativa exige --yes"
  fi
  printf '\nProxy HTTPS do PDL PRO (Nginx da máquina → Compose)\n\n'
  domain="$(prompt_value "Domínio" "$domain")"
  domain="${domain,,}"
  http_port="$(prompt_value "Porta do painel" "$http_port")"
  if [[ "$www" -eq 0 ]]; then
    prompt_yes "Incluir www.${domain:-dominio}?" 0 && www=1
  fi
  if [[ "$ssl_flag" -eq 0 ]]; then
    prompt_yes "Emitir Let's Encrypt?" 1 && setup_ssl=1
  fi
  if [[ "$setup_ssl" -eq 1 && -z "$email" && "$no_email" -ne 1 ]]; then
    email="$(prompt_value "E-mail do certificado" "admin@${domain}")"
  fi
  prompt_yes "Continuar?" 1 || die "configuração cancelada"
fi

[[ -n "$upstream" ]] || upstream="127.0.0.1:${http_port}"
www_alias=""
www_host=""
if [[ "$www" -eq 1 && -n "$domain" ]]; then
  www_host="www.${domain}"
  www_alias=" ${www_host}"
fi

if [[ "$dry_run" -eq 1 ]]; then
  printf 'domain=%s\n' "$domain"
  printf 'upstream=%s\n' "$upstream"
  printf 'ssl=%s\n' "$setup_ssl"
  printf 'www=%s\n' "$www"
  printf 'channel=%s\n' "$channel"
  exit 0
fi

is_valid_proxy_domain "$domain" || die "domínio inválido: ${domain:-<vazio>}"
is_valid_proxy_port "$http_port" || die "porta inválida: $http_port"
[[ "$upstream" =~ ^[0-9A-Za-z._-]+:[0-9]+$ ]] || die "upstream inválido: $upstream"
if [[ "$www" -eq 1 ]]; then
  is_valid_proxy_domain "$www_host" || die "domínio www inválido: $www_host"
fi
if [[ "$setup_ssl" -eq 1 && -z "$email" && "$no_email" -ne 1 ]]; then
  die "--ssl exige --email ou --no-email"
fi
if [[ -n "$email" ]] && ! is_valid_proxy_email "$email"; then
  die "e-mail inválido: $email"
fi

if [[ -n "$write_config" ]]; then
  render_pdl_site "$domain" "$upstream" "$NGINX_WEB_ROOT" "$setup_ssl" "$www_alias" \
    > "$write_config"
  success "Site gravado em $write_config"
  exit 0
fi

if [[ "${PDL_SKIP_SYSTEM:-0}" != "1" && "${EUID}" -ne 0 ]]; then
  sudo_args=(--domain "$domain" --port "$http_port" --upstream "$upstream" --channel "$channel")
  [[ "$www" -eq 1 ]] && sudo_args+=(--www)
  [[ "$setup_ssl" -eq 1 ]] && sudo_args+=(--ssl)
  [[ -n "$email" ]] && sudo_args+=(--email "$email")
  [[ "$no_email" -eq 1 ]] && sudo_args+=(--no-email)
  [[ "$reinstall" -eq 1 ]] && sudo_args+=(--reinstall)
  [[ "$assume_yes" -eq 1 ]] && sudo_args+=(--yes)
  exec sudo --preserve-env=PDL_ENV_FILE,PDL_NGINX_ROOT,PDL_NGINX_SITE_NAME,PDL_NGINX_WEB_ROOT,PDL_NGINX_TEMPLATE,PDL_SKIP_SYSTEM \
    bash "$0" "${sudo_args[@]}"
fi

if [[ "${PDL_SKIP_SYSTEM:-0}" == "1" ]]; then
  write_pdl_site "$domain" "$upstream" "$setup_ssl" "$www_alias"
  success "Site ${NGINX_SITE_NAME} gravado em ${NGINX_ROOT} (PDL_SKIP_SYSTEM=1)"
  info "http${setup_ssl:+s}://${domain} → http://${upstream}"
  exit 0
fi

install_host_nginx "$channel" "$reinstall"
write_pdl_site "$domain" "$upstream" 0 "$www_alias"
nginx -t
systemctl enable nginx
systemctl reload nginx || systemctl restart nginx

if [[ "$setup_ssl" -eq 1 ]]; then
  if issue_certificate "$domain" "$email" "$no_email" "$www_host"; then
    write_pdl_site "$domain" "$upstream" 1 "$www_alias"
    nginx -t
    systemctl reload nginx
  else
    warn "Certificado não emitido; o painel segue em http://${domain}"
    write_pdl_site "$domain" "$upstream" 0 "$www_alias"
    nginx -t
    systemctl reload nginx || true
  fi
fi

scheme="http"
[[ "$setup_ssl" -eq 1 && -f "$(ssl_cert_path "$domain")" ]] && scheme="https"
success "Proxy em ${scheme}://${domain} → http://${upstream}"
info "Arquivo: $(nginx_available_path)"
info "Crie o administrador: docker compose --env-file .env -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
