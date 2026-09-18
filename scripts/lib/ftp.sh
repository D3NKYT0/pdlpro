# Helpers do FTP do launcher (vsftpd na máquina anfitriã).
# shellcheck shell=bash

FTP_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FTP_TEMPLATE="${PDL_FTP_TEMPLATE:-${FTP_LIB_DIR}/../ftp/vsftpd.conf.template}"
LAUNCHER_TEMPLATE="${PDL_LAUNCHER_TEMPLATE:-${FTP_LIB_DIR}/../ftp/launcher.conf.template}"
VSFTPD_CONF="${PDL_VSFTPD_CONF:-/etc/vsftpd.conf}"

is_valid_ftp_user() {
  [[ "$1" =~ ^[a-z_][a-z0-9_-]{0,31}$ ]] || return 1
  [[ "$1" != "root" && "$1" != "www-data" && "$1" != "nginx" && "$1" != "nobody" ]]
}

is_absolute_unix_path() {
  [[ "$1" =~ ^/[A-Za-z0-9._/+-]*$ ]] && [[ "$1" != *..* ]]
}

is_valid_pasv_port() {
  [[ "$1" =~ ^[0-9]+$ ]] && (( $1 >= 1024 && $1 <= 65535 ))
}

# user dir pasv_min pasv_max banner ftps ssl_cert ssl_key
render_vsftpd_conf() {
  local user="$1"
  local directory="$2"
  local pasv_min="$3"
  local pasv_max="$4"
  local banner="$5"
  local ftps="$6"
  local ssl_cert="$7"
  local ssl_key="$8"
  [[ -f "$FTP_TEMPLATE" ]] || {
    printf 'template FTP ausente: %s\n' "$FTP_TEMPLATE" >&2
    return 1
  }
  awk -v user="$user" \
      -v directory="$directory" \
      -v pasv_min="$pasv_min" \
      -v pasv_max="$pasv_max" \
      -v banner="$banner" \
      -v ssl="$ftps" \
      -v ssl_cert="$ssl_cert" \
      -v ssl_key="$ssl_key" '
    function subst(line) {
      gsub(/\{\{user\}\}/, user, line)
      gsub(/\{\{directory\}\}/, directory, line)
      gsub(/\{\{pasv_min\}\}/, pasv_min, line)
      gsub(/\{\{pasv_max\}\}/, pasv_max, line)
      gsub(/\{\{banner\}\}/, banner, line)
      gsub(/\{\{ssl_cert\}\}/, ssl_cert, line)
      gsub(/\{\{ssl_key\}\}/, ssl_key, line)
      return line
    }
    /^\{\{#ftps\}\}$/ { skip = (ssl != "1"); next }
    /^\{\{\/ftps\}\}$/ { skip = 0; next }
    /^\{\{#plain\}\}$/ { skip = (ssl == "1"); next }
    /^\{\{\/plain\}\}$/ { skip = 0; next }
    skip { next }
    { print subst($0) }
  ' "$FTP_TEMPLATE"
}

# domain directory web_root ssl
render_launcher_site() {
  local domain="$1"
  local directory="$2"
  local web_root="$3"
  local ssl="$4"
  local ssl_cert ssl_key ssl_label
  ssl_cert="$(ssl_cert_path "$domain")"
  ssl_key="$(ssl_key_path "$domain")"
  ssl_label="off"
  [[ "$ssl" == "1" ]] && ssl_label="on"
  [[ -f "$LAUNCHER_TEMPLATE" ]] || {
    printf 'template do launcher ausente: %s\n' "$LAUNCHER_TEMPLATE" >&2
    return 1
  }
  awk -v domain="$domain" \
      -v directory="$directory" \
      -v web_root="$web_root" \
      -v ssl="$ssl" \
      -v ssl_label="$ssl_label" \
      -v ssl_cert="$ssl_cert" \
      -v ssl_key="$ssl_key" '
    function subst(line) {
      gsub(/\{\{domain\}\}/, domain, line)
      gsub(/\{\{directory\}\}/, directory, line)
      gsub(/\{\{web_root\}\}/, web_root, line)
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
  ' "$LAUNCHER_TEMPLATE"
}
