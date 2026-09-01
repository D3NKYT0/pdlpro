#!/usr/bin/env bash

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "${LIB_DIR}/../.." && pwd)"
readonly COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
readonly ENV_FILE="${ROOT_DIR}/.env"

info() {
  printf '[INFO] %s\n' "$*"
}

success() {
  printf '[OK] %s\n' "$*"
}

warn() {
  printf '[AVISO] %s\n' "$*" >&2
}

die() {
  printf '[ERRO] %s\n' "$*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "comando obrigatório não encontrado: $1"
}

require_docker() {
  require_command docker
  docker info >/dev/null 2>&1 || die "o Docker não está em execução ou não está acessível"
  docker compose version >/dev/null 2>&1 || die "Docker Compose v2 não está disponível"
}

require_project_files() {
  [[ -f "$COMPOSE_FILE" ]] || die "docker-compose.yml não encontrado em $ROOT_DIR"
}

ensure_env_file() {
  if [[ -f "$ENV_FILE" ]]; then
    return 0
  fi

  [[ -f "${ROOT_DIR}/.env.example" ]] || die ".env e .env.example não foram encontrados"
  cp "${ROOT_DIR}/.env.example" "$ENV_FILE"
  warn ".env criado a partir de .env.example; revise segredos e configurações antes de produção"
}

compose() {
  docker compose --project-directory "$ROOT_DIR" --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

service_is_running() {
  local service="$1"
  [[ "$(compose ps --status running --quiet "$service" 2>/dev/null)" != "" ]]
}

ensure_database_running() {
  if ! service_is_running db; then
    info "Iniciando o PostgreSQL..."
    compose up -d db
  fi

  local attempt
  for attempt in $(seq 1 60); do
    if compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  die "o PostgreSQL não ficou pronto dentro do tempo esperado"
}

sha256_file() {
  local path="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$path" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$path" | awk '{print $1}'
  elif command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 "$path" | awk '{print $NF}'
  else
    return 1
  fi
}
