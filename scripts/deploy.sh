#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Constrói e inicia/atualiza os serviços Docker Compose.

Uso:
  ./setup.sh deploy [--production] [--build|--no-build] [--dev] [--pull]

Opções:
  --build     Reconstrói as imagens (padrão).
  --no-build  Reutiliza as imagens locais existentes.
  --dev       Ativa o perfil dev e inicia o frontend Vite.
  --production  Build estático e Django production atrás do proxy reverso.
                Detectado automaticamente quando o .env usa settings de produção.
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
production=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) build=1 ;;
    --no-build) build=0 ;;
    --dev) dev=1 ;;
    --production) production=1 ;;
    --pull) pull=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opção desconhecida para deploy: $1" ;;
  esac
  shift
done

if [[ "$production" -eq 1 && "$dev" -eq 1 ]]; then
  die "--production e --dev não podem ser usados juntos"
fi

require_project_files
require_docker
ensure_env_file
cd "$ROOT_DIR"

if [[ "$production" -eq 0 && "$dev" -eq 0 ]]; then
  settings_module="$(read_env_value DJANGO_SETTINGS_MODULE)"
  if [[ "$settings_module" == "core.settings.production" ]]; then
    production=1
    info "Ambiente de produção detectado pelo .env."
  fi
fi

if [[ "$production" -eq 1 ]]; then
  [[ -f "$PRODUCTION_COMPOSE_FILE" ]] || die "docker-compose.prod.yml não encontrado"
  domain="$(read_env_value DOMAIN)"
  secret_key="$(read_env_value SECRET_KEY)"
  db_password="$(read_env_value DB_PASSWORD)"
  allowed_hosts="$(read_env_value ALLOWED_HOSTS)"
  cors_origins="$(read_env_value CORS_ALLOWED_ORIGINS)"
  csrf_origins="$(read_env_value CSRF_TRUSTED_ORIGINS)"
  [[ -n "$domain" ]] || die "defina DOMAIN no .env"
  [[ "$domain" != "localhost" ]] || die "DOMAIN não pode ser localhost em produção"
  [[ ${#secret_key} -ge 50 && "$secret_key" != change-me-* ]] || die "defina uma SECRET_KEY forte (mínimo de 50 caracteres) no .env"
  [[ ${#db_password} -ge 16 && "$db_password" != "pdl" ]] || die "defina uma DB_PASSWORD forte (mínimo de 16 caracteres) no .env"
  [[ ",$allowed_hosts," == *",$domain,"* ]] || die "inclua $domain em ALLOWED_HOSTS no .env"
  [[ ",$cors_origins," == *",https://$domain,"* ]] || die "inclua https://$domain em CORS_ALLOWED_ORIGINS no .env"
  [[ ",$csrf_origins," == *",https://$domain,"* ]] || die "inclua https://$domain em CSRF_TRUSTED_ORIGINS no .env"
fi

compose_args=()
if [[ "$production" -eq 1 ]]; then
  compose_runner=production_compose
elif [[ "$dev" -eq 1 ]]; then
  compose_args+=(--profile dev)
  compose_runner=compose
else
  compose_runner=compose
fi

if [[ "$pull" -eq 1 ]]; then
  info "Atualizando imagens base..."
  "$compose_runner" "${compose_args[@]}" pull
fi

up_args=(up -d --remove-orphans)
if [[ "$build" -eq 1 ]]; then
  up_args+=(--build)
fi

info "Iniciando deploy..."
"$compose_runner" "${compose_args[@]}" "${up_args[@]}"
"$compose_runner" "${compose_args[@]}" ps
success "Deploy concluído."
