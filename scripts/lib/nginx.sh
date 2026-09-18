# Helpers do proxy Nginx da máquina anfitriã (não o Nginx do container web).
# shellcheck shell=bash

NGINX_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_TEMPLATE="${PDL_NGINX_TEMPLATE:-${NGINX_LIB_DIR}/../nginx/pdlpro.conf.template}"
NGINX_ROOT="${PDL_NGINX_ROOT:-/etc/nginx}"
NGINX_SITE_NAME="${PDL_NGINX_SITE_NAME:-pdlpro}"
NGINX_WEB_ROOT="${PDL_NGINX_WEB_ROOT:-/var/www/html}"

nginx_available_path() {
  printf '%s/sites-available/%s' "$NGINX_ROOT" "$NGINX_SITE_NAME"
}

nginx_enabled_path() {
  printf '%s/sites-enabled/%s' "$NGINX_ROOT" "$NGINX_SITE_NAME"
}

is_valid_proxy_domain() {
  local domain="$1"
  [[ "$domain" =~ ^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$ ]]
}

is_valid_proxy_port() {
  local port="$1"
  [[ "$port" =~ ^[0-9]+$ ]] && ((port >= 1 && port <= 65535))
}

is_valid_proxy_email() {
  local value="$1"
  [[ "$value" =~ ^[^[:space:]@]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$ ]]
}

ssl_cert_path() {
  printf '/etc/letsencrypt/live/%s/fullchain.pem' "$1"
}

ssl_key_path() {
  printf '/etc/letsencrypt/live/%s/privkey.pem' "$1"
}

# Preenche scripts/nginx/pdlpro.conf.template. ssl=1 inclui :443 e redireciona :80.
render_pdl_site() {
  local domain="$1"
  local upstream="$2"
  local web_root="$3"
  local ssl="$4"
  local www_alias="$5"
  local template="${6:-$NGINX_TEMPLATE}"
  local ssl_cert ssl_key ssl_label
  ssl_cert="$(ssl_cert_path "$domain")"
  ssl_key="$(ssl_key_path "$domain")"
  ssl_label="off"
  [[ "$ssl" == "1" ]] && ssl_label="on"
  [[ -f "$template" ]] || {
    printf 'template Nginx ausente: %s\n' "$template" >&2
    return 1
  }

  awk -v domain="$domain" \
      -v upstream="$upstream" \
      -v web_root="$web_root" \
      -v ssl="$ssl" \
      -v ssl_label="$ssl_label" \
      -v www_alias="$www_alias" \
      -v ssl_cert="$ssl_cert" \
      -v ssl_key="$ssl_key" '
    function subst(line) {
      gsub(/\{\{domain\}\}/, domain, line)
      gsub(/\{\{upstream\}\}/, upstream, line)
      gsub(/\{\{web_root\}\}/, web_root, line)
      gsub(/\{\{www_alias\}\}/, www_alias, line)
      gsub(/\{\{ssl_cert\}\}/, ssl_cert, line)
      gsub(/\{\{ssl_key\}\}/, ssl_key, line)
      gsub(/\{\{ssl\}\}/, ssl_label, line)
      return line
    }
    /^\{\{#ssl\}\}$/ { skip = (ssl != "1"); next }
    /^\{\{\/ssl\}\}$/ { skip = 0; next }
    /^\{\{#http\}\}$/ { skip = (ssl == "1"); next }
    /^\{\{\/http\}\}$/ { skip = 0; next }
    skip { next }
    { print subst($0) }
  ' "$template"
}

ensure_nginx_site_layout() {
  mkdir -p "${NGINX_ROOT}/sites-available" "${NGINX_ROOT}/sites-enabled"
  mkdir -p "${NGINX_WEB_ROOT}/.well-known/acme-challenge"
}

ensure_nginx_sites_include() {
  local conf="${NGINX_ROOT}/nginx.conf"
  local include_line="    include ${NGINX_ROOT}/sites-enabled/*;"
  [[ -f "$conf" ]] || return 0
  grep -qF "include ${NGINX_ROOT}/sites-enabled/" "$conf" && return 0
  grep -qF "include /etc/nginx/sites-enabled/" "$conf" && return 0
  if [[ ! -f "${conf}.pdlpro.bak" ]]; then
    cp -- "$conf" "${conf}.pdlpro.bak"
  fi
  if grep -q "http[[:space:]]*{" "$conf"; then
    awk -v line="$include_line" '
      BEGIN { added = 0 }
      {
        print
        if (!added && $0 ~ /http[[:space:]]*\{/) {
          print line
          added = 1
        }
      }
    ' "$conf" > "${conf}.pdlpro.tmp"
    mv -f -- "${conf}.pdlpro.tmp" "$conf"
  else
    printf '\nhttp {\n%s\n}\n' "$include_line" >> "$conf"
  fi
}

write_pdl_site() {
  local domain="$1"
  local upstream="$2"
  local ssl="$3"
  local www_alias="$4"
  ensure_nginx_site_layout
  ensure_nginx_sites_include
  render_pdl_site "$domain" "$upstream" "$NGINX_WEB_ROOT" "$ssl" "$www_alias" \
    > "$(nginx_available_path)"
  ln -sfn "$(nginx_available_path)" "$(nginx_enabled_path)"
  if [[ -L "${NGINX_ROOT}/sites-enabled/default" || -f "${NGINX_ROOT}/sites-enabled/default" ]]; then
    rm -f "${NGINX_ROOT}/sites-enabled/default"
  fi
}
