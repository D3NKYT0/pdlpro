#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Prepara a configuração inicial e inicia o PDL PRO.

Uso:
  ./setup.sh install [--production|--no-dev] [--no-start]

Opções:
  --no-start  Valida o ambiente e cria o .env, mas não inicia os serviços.
  --no-dev    Não inicia o frontend Vite (a instalação local usa dev por padrão).
  --production  Usa build estático, settings de produção e HTTPS automático.
  -h, --help  Exibe esta ajuda.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Configura o ambiente inicial e inicia os serviços'
  exit 0
fi

start_services=1
deploy_args=(--build --dev)

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-start) start_services=0 ;;
    --no-dev) deploy_args=(--build) ;;
    --production) deploy_args=(--production --build) ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para install: $1" ;;
  esac
  shift
done

require_project_files
require_docker
ensure_env_file

success "Pré-requisitos validados."

if [[ "$start_services" -eq 0 ]]; then
  info "Instalação preparada sem iniciar os containers (--no-start)."
  exit 0
fi

exec bash "${SCRIPT_DIR}/deploy.sh" "${deploy_args[@]}"
