#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Constrói e inicia/atualiza os serviços Docker Compose.

Uso:
  ./setup.sh deploy [--build|--no-build] [--dev] [--pull]

Opções:
  --build     Reconstrói as imagens (padrão).
  --no-build  Reutiliza as imagens locais existentes.
  --dev       Ativa o perfil dev e inicia o frontend Vite.
  --pull      Atualiza as imagens base antes do deploy.
  -h, --help  Exibe esta ajuda.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Constrói e publica os serviços com Docker Compose'
  exit 0
fi

build=1
dev=0
pull=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) build=1 ;;
    --no-build) build=0 ;;
    --dev) dev=1 ;;
    --pull) pull=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para deploy: $1" ;;
  esac
  shift
done

require_project_files
require_docker
ensure_env_file
cd "$ROOT_DIR"

compose_args=()
if [[ "$dev" -eq 1 ]]; then
  compose_args+=(--profile dev)
fi

if [[ "$pull" -eq 1 ]]; then
  info "Atualizando imagens base..."
  compose "${compose_args[@]}" pull
fi

up_args=(up -d --remove-orphans)
if [[ "$build" -eq 1 ]]; then
  up_args+=(--build)
fi

info "Iniciando deploy..."
compose "${compose_args[@]}" "${up_args[@]}"
compose "${compose_args[@]}" ps
success "Deploy concluído."
