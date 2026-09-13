#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Prepara a configuração inicial e inicia o PDL PRO.

Uso:
  ./setup.sh install [--production|--no-dev] [--no-start] [--pull]

Opções:
  --no-start  Valida o ambiente e cria o .env, mas não inicia os serviços.
  --no-dev    Não inicia o frontend Vite (a instalação local usa dev por padrão).
  --production  Usa settings de produção atrás do proxy reverso.
                Com imagens publicadas no .env, puxa do registro; senão, constrói.
  --pull      Atualiza as imagens base/publicadas antes de iniciar.
  -h, --help  Exibe esta ajuda.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Configura o ambiente inicial e inicia os serviços'
  exit 0
fi

start_services=1
deploy_args=(--dev)
production=0
pull=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-start) start_services=0 ;;
    --no-dev)
      if [[ "$production" -eq 1 ]]; then
        die "--no-dev não se aplica a --production"
      fi
      deploy_args=()
      ;;
    --production)
      production=1
      deploy_args=(--production)
      ;;
    --pull) pull=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para install: $1" ;;
  esac
  shift
done

if [[ "$pull" -eq 1 ]]; then
  deploy_args+=(--pull)
fi

if [[ "$production" -eq 1 ]]; then
  require_production_files
else
  require_project_files
fi
require_docker
ensure_env_file

success "Pré-requisitos validados."

if [[ "$start_services" -eq 0 ]]; then
  info "Instalação preparada sem iniciar os containers (--no-start)."
  exit 0
fi

exec bash "${SCRIPT_DIR}/deploy.sh" "${deploy_args[@]}"
