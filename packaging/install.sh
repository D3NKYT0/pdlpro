#!/usr/bin/env bash
# Instalador público da versão publicada do PDL PRO (Linux).
# Baixa o ZIP da GitHub Release, configura o .env e sobe o Compose com imagens GHCR.
set -Eeuo pipefail

DEFAULT_REPO="${PDL_GITHUB_REPO:-D3NKYT0/pdlpro}"
DEFAULT_REGISTRY="${PDL_IMAGE_REGISTRY:-ghcr.io/d3nkyt0/pdlpro}"

info() { printf '[INFO] %s\n' "$*"; }
success() { printf '[OK] %s\n' "$*"; }
warn() { printf '[AVISO] %s\n' "$*" >&2; }
die() { printf '[ERRO] %s\n' "$*" >&2; exit 1; }

show_help() {
  cat <<'EOF'
Instala uma versão publicada do PDL PRO (imagens Docker + Compose).

Uso:
  ./install.sh --domain painel.exemplo.com [--yes]
  curl -fsSL .../install.sh -o install.sh && bash install.sh --domain painel.exemplo.com --yes

Opções:
  --version X.Y.Z     Versão (padrão: latest da GitHub Release)
  --dir DIRETORIO     Destino (padrão: /opt/pdlpro ou ~/pdlpro)
  --domain DOMINIO    Domínio público HTTPS (obrigatório com --yes)
  --bind-address IP   IP do proxy interno (padrão: 0.0.0.0)
  --port PORTA        Porta HTTP interna (padrão: 8080)
  --no-start          Só baixa, extrai e configura o .env
  --install-docker    Instala Docker Engine + Compose v2 automaticamente
                      (usa get.docker.com; exige apt, dnf ou yum e root/sudo)
  --skip-docker       Não exige Docker (só para testes / --no-start)
  --skip-checksum     Não baixa nem confere o SHA-256
  --yes               Não pergunta confirmação
  -h, --help          Ajuda

Variáveis:
  PDL_GITHUB_REPO, PDL_IMAGE_REGISTRY, PDL_RELEASE_BUNDLE,
  PDL_RELEASE_API_URL, PDL_SKIP_DOCKER, PDL_SKIP_CHECKSUM,
  PDL_INSTALL_DRY_RUN, PDL_INSTALL_DIR
EOF
}

version="latest"
install_dir=""
domain=""
bind_address="0.0.0.0"
http_port="8080"
assume_yes=0
no_start=0
install_docker=0
skip_docker=0
skip_checksum=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --version)
      [[ $# -ge 2 ]] || die "--version exige um valor"
      version="$2"
      shift
      ;;
    --dir)
      [[ $# -ge 2 ]] || die "--dir exige um diretório"
      install_dir="$2"
      shift
      ;;
    --domain)
      [[ $# -ge 2 ]] || die "--domain exige um domínio"
      domain="$2"
      shift
      ;;
    --bind-address)
      [[ $# -ge 2 ]] || die "--bind-address exige um IP"
      bind_address="$2"
      shift
      ;;
    --port)
      [[ $# -ge 2 ]] || die "--port exige uma porta"
      http_port="$2"
      shift
      ;;
    --no-start) no_start=1 ;;
    --install-docker) install_docker=1 ;;
    --skip-docker) skip_docker=1 ;;
    --skip-checksum) skip_checksum=1 ;;
    -y|--yes) assume_yes=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida: $1" ;;
  esac
  shift
done

normalize_version() {
  local value="$1"
  if [[ "$value" == "latest" ]]; then
    printf 'latest'
    return 0
  fi
  value="${value#v}"
  [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-+][A-Za-z0-9.-]+)?$ ]] ||
    die "versão inválida: $1"
  printf '%s' "$value"
}

local_source_path() {
  local url="$1"
  if [[ "$url" == file://* ]]; then
    url="${url#file://}"
  fi
  if [[ -f "$url" ]]; then
    printf '%s' "$url"
    return 0
  fi
  return 1
}

fetch_text() {
  local url="$1"
  local local_path
  if local_path="$(local_source_path "$url")"; then
    cat "$local_path"
    return 0
  fi
  command -v curl >/dev/null 2>&1 || die "curl é necessário para baixar a release"
  curl -fsSL --connect-timeout 15 --max-time 120 "$url"
}

resolve_version() {
  local requested="$1"
  if [[ "$requested" != "latest" ]]; then
    normalize_version "$requested"
    return 0
  fi
  local api_url payload tag
  api_url="${PDL_RELEASE_API_URL:-https://api.github.com/repos/${DEFAULT_REPO}/releases/latest}"
  payload="$(fetch_text "$api_url")" || die "não foi possível consultar a última release"
  tag="$(printf '%s' "$payload" | awk -F'"' '/"tag_name"[[:space:]]*:/ { print $4; exit }')"
  [[ -n "$tag" ]] || die "a API de releases não devolveu tag_name"
  normalize_version "$tag"
}

default_install_dir() {
  if [[ -n "${PDL_INSTALL_DIR:-}" ]]; then
    printf '%s' "$PDL_INSTALL_DIR"
    return 0
  fi
  if [[ -d /opt && -w /opt ]] || [[ -w /opt/pdlpro ]]; then
    printf '/opt/pdlpro'
    return 0
  fi
  printf '%s/pdlpro' "${HOME:-.}"
}

download_file() {
  local url="$1"
  local dest="$2"
  local local_path
  if local_path="$(local_source_path "$url")"; then
    cp -- "$local_path" "$dest"
    return 0
  fi
  if [[ "$url" != https://* && "$url" != http://* ]]; then
    die "pacote local não encontrado: $url"
  fi
  command -v curl >/dev/null 2>&1 || die "curl é necessário para baixar a release"
  curl -fL --connect-timeout 15 --max-time 180 --retry 3 --retry-delay 2 -o "$dest" "$url"
}

extract_zip() {
  local zip_path="$1"
  local dest="$2"
  mkdir -p "$dest"
  if command -v unzip >/dev/null 2>&1; then
    unzip -q "$zip_path" -d "$dest"
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -m zipfile -e "$zip_path" "$dest"
    return 0
  fi
  if command -v python >/dev/null 2>&1; then
    python -m zipfile -e "$zip_path" "$dest"
    return 0
  fi
  die "unzip ou python é necessário para extrair o pacote"
}

find_bundle_root() {
  local extracted="$1"
  if [[ -f "${extracted}/setup.sh" ]]; then
    printf '%s' "$extracted"
    return 0
  fi
  local candidate
  for candidate in "${extracted}"/pdl-pro-*; do
    if [[ -f "${candidate}/setup.sh" ]]; then
      printf '%s' "$candidate"
      return 0
    fi
  done
  die "o ZIP extraído não contém setup.sh"
}

verify_checksum() {
  local zip_path="$1"
  local checksum_file="$2"
  [[ "${PDL_SKIP_CHECKSUM:-0}" == "1" ]] && return 0
  [[ -f "$checksum_file" ]] || return 0
  local expected actual
  expected="$(awk '{ print $1; exit }' "$checksum_file")"
  if command -v sha256sum >/dev/null 2>&1; then
    actual="$(sha256sum "$zip_path" | awk '{ print $1 }')"
  elif command -v shasum >/dev/null 2>&1; then
    actual="$(shasum -a 256 "$zip_path" | awk '{ print $1 }')"
  else
    warn "sem sha256sum; checksum não verificado"
    return 0
  fi
  [[ "$expected" == "$actual" ]] || die "checksum SHA-256 do pacote não confere"
}

copy_bundle() {
  local source_root="$1"
  local dest="$2"
  mkdir -p "$dest"
  if [[ -f "${dest}/.env" ]]; then
    cp -p -- "${dest}/.env" "${dest}/.env.install-keep"
  fi
  cp -a "${source_root}/." "$dest/"
  if [[ -f "${dest}/.env.install-keep" ]]; then
    mv -f -- "${dest}/.env.install-keep" "${dest}/.env"
  fi
}

require_domain() {
  [[ -n "$domain" ]] || die "informe --domain (ex.: painel.exemplo.com)"
  [[ "$domain" =~ ^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$ ]] || die "domínio inválido: $domain"
}

resolved_version="$(resolve_version "$version")"
[[ -n "$install_dir" ]] || install_dir="$(default_install_dir)"
bundle_filename="pdl-pro-${resolved_version}.zip"
tag="v${resolved_version}"
bundle_url="${PDL_RELEASE_BUNDLE:-https://github.com/${DEFAULT_REPO}/releases/download/${tag}/${bundle_filename}}"
checksum_url="${PDL_RELEASE_CHECKSUM:-https://github.com/${DEFAULT_REPO}/releases/download/${tag}/${bundle_filename}.sha256}"

if [[ "${PDL_INSTALL_DRY_RUN:-0}" == "1" ]]; then
  printf 'version=%s\n' "$resolved_version"
  printf 'dir=%s\n' "$install_dir"
  printf 'bundle=%s\n' "$bundle_url"
  printf 'checksum=%s\n' "$checksum_url"
  printf 'registry=%s\n' "$DEFAULT_REGISTRY"
  [[ -n "$domain" ]] && printf 'domain=%s\n' "$domain"
  exit 0
fi

if [[ "$assume_yes" -eq 1 ]]; then
  require_domain
elif [[ ! -t 0 ]]; then
  die "execução não interativa exige --yes e --domain"
elif [[ -z "$domain" ]]; then
  printf 'Domínio público (ex.: painel.exemplo.com): '
  read -r domain
  require_domain
fi

if [[ "$skip_docker" -eq 1 ]]; then
  PDL_SKIP_DOCKER=1
  export PDL_SKIP_DOCKER
fi

# ---------------------------------------------------------------------------
# Instalação automática do Docker (--install-docker)
# ---------------------------------------------------------------------------
auto_install_docker() {
  if command -v docker > /dev/null 2>&1; then
    info "Docker já instalado: $(docker --version)"
    return 0
  fi

  info "Instalando Docker Engine via get.docker.com ..."

  # Detecta gerenciador de pacotes
  if command -v apt-get > /dev/null 2>&1; then
    PKG_MGR="apt"
  elif command -v dnf > /dev/null 2>&1; then
    PKG_MGR="dnf"
  elif command -v yum > /dev/null 2>&1; then
    PKG_MGR="yum"
  else
    die "--install-docker requer apt, dnf ou yum. Instale o Docker manualmente: https://docs.docker.com/engine/install/"
  fi

  # Verifica acesso root/sudo
  if [[ $EUID -ne 0 ]] && ! command -v sudo > /dev/null 2>&1; then
    die "--install-docker precisa de root ou sudo para instalar pacotes"
  fi
  local SUDO=""
  [[ $EUID -ne 0 ]] && SUDO="sudo"

  # Baixa e executa o script oficial do Docker
  local get_script
  get_script="$(mktemp /tmp/get-docker.XXXXXX.sh)"
  if command -v curl > /dev/null 2>&1; then
    curl -fsSL "https://get.docker.com" -o "$get_script"
  elif command -v wget > /dev/null 2>&1; then
    wget -qO "$get_script" "https://get.docker.com"
  else
    die "curl ou wget são necessários para --install-docker"
  fi
  chmod +x "$get_script"
  $SUDO sh "$get_script"
  rm -f "$get_script"

  # Adiciona o usuário atual ao grupo docker para não precisar de sudo
  if [[ $EUID -ne 0 ]] && command -v usermod > /dev/null 2>&1; then
    $SUDO usermod -aG docker "$USER" || true
    warn "Usuário '$USER' adicionado ao grupo 'docker'."
    warn "Rode 'newgrp docker' ou abra uma nova sessão para usar Docker sem sudo."
  fi

  success "Docker instalado: $(docker --version)"
}

if [[ "${PDL_SKIP_DOCKER:-0}" != "1" ]]; then
  if [[ "$install_docker" -eq 1 ]] || [[ "${PDL_INSTALL_DOCKER:-0}" == "1" ]]; then
    auto_install_docker
  fi
  command -v docker > /dev/null 2>&1 || die "instale o Docker Engine com o plugin Compose v2 (ou passe --install-docker)"
  docker info > /dev/null 2>&1 || die "o Docker não está em execução"
  docker compose version > /dev/null 2>&1 || die "Docker Compose v2 não está disponível"
fi

if [[ "$assume_yes" -ne 1 ]]; then
  printf '\nVersão: %s\nDestino: %s\nDomínio: https://%s\n\nContinuar? [s/N] ' \
    "$resolved_version" "$install_dir" "$domain"
  read -r answer
  [[ "$answer" =~ ^[sS]$ ]] || die "instalação cancelada"
fi

work_dir="$(mktemp -d "${TMPDIR:-/tmp}/pdl-install.XXXXXX")"
cleanup() { rm -rf "$work_dir"; }
trap cleanup EXIT

if [[ "$skip_checksum" -eq 1 || "${PDL_SKIP_CHECKSUM:-0}" == "1" || "$bundle_url" != https://* ]]; then
  PDL_SKIP_CHECKSUM=1
  export PDL_SKIP_CHECKSUM
fi

info "Baixando ${bundle_filename}..."
download_file "$bundle_url" "${work_dir}/${bundle_filename}"
if [[ "${PDL_SKIP_CHECKSUM:-0}" != "1" ]]; then
  if download_file "$checksum_url" "${work_dir}/${bundle_filename}.sha256" 2>/dev/null; then
    verify_checksum "${work_dir}/${bundle_filename}" "${work_dir}/${bundle_filename}.sha256"
  else
    warn "checksum remoto indisponível; o ZIP não foi verificado"
  fi
fi

extract_zip "${work_dir}/${bundle_filename}" "${work_dir}/extracted"
bundle_root="$(find_bundle_root "${work_dir}/extracted")"
copy_bundle "$bundle_root" "$install_dir"
chmod +x "${install_dir}/setup.sh" 2>/dev/null || true

export PDL_IMAGE_REGISTRY="$DEFAULT_REGISTRY"
info "Configurando produção em ${install_dir}..."
(
  cd "$install_dir"
  export PDL_ENV_FILE="${install_dir}/.env"
  export PDL_SKIP_DOCKER="${PDL_SKIP_DOCKER:-0}"
  # shellcheck source=/dev/null
  source "${install_dir}/scripts/lib/common.sh"
  bash "${install_dir}/scripts/configure-production.sh" --yes \
    --domain "$domain" \
    --bind-address "$bind_address" \
    --port "$http_port"
  apply_published_release_images "$resolved_version"
)

success "Arquivos em ${install_dir}"
if [[ "$no_start" -eq 1 ]]; then
  info "Instalação preparada sem iniciar os containers (--no-start)."
  exit 0
fi

if [[ "${PDL_SKIP_DOCKER:-0}" == "1" ]]; then
  info "PDL_SKIP_DOCKER=1: serviços não foram iniciados."
  exit 0
fi

bash "${install_dir}/setup.sh" install --production
success "PDL PRO ${resolved_version} em execução. Próximo passo: proxy HTTPS → http://${bind_address}:${http_port}"
