#!/usr/bin/env bash

LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly ROOT_DIR="$(cd "${LIB_DIR}/../.." && pwd)"
readonly COMPOSE_FILE="${ROOT_DIR}/docker-compose.yml"
readonly PRODUCTION_COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
readonly ENV_FILE="${PDL_ENV_FILE:-${ROOT_DIR}/.env}"

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

production_compose() {
  docker compose --project-directory "$ROOT_DIR" --env-file "$ENV_FILE" -f "$PRODUCTION_COMPOSE_FILE" "$@"
}

production_is_active() {
  [[ -f "$PRODUCTION_COMPOSE_FILE" ]] &&
    [[ -n "$(production_compose ps --all --quiet web 2>/dev/null)" ]]
}

operational_compose() {
  if production_is_active; then
    production_compose "$@"
  else
    compose "$@"
  fi
}

read_env_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/\r$/, ""); sub(/^[^=]*=/, ""); print; exit }' "$ENV_FILE"
}

env_has_key() {
  local key="$1"
  local file="${2:-$ENV_FILE}"
  awk -F= -v key="$key" '
    { sub(/\r$/, "") }
    $1 == key { found = 1; exit }
    END { exit !found }
  ' "$file"
}

list_env_keys() {
  local file="${1:-$ENV_FILE}"
  awk -F= '
    {
      sub(/\r$/, "")
      if ($0 ~ /^[A-Za-z_][A-Za-z0-9_]*=/) print $1
    }
  ' "$file"
}

set_env_value() {
  local key="$1"
  local value="$2"
  local temporary_file

  temporary_file="$(mktemp "${ENV_FILE}.tmp.XXXXXX")"
  awk -v key="$key" -v value="$value" '
    BEGIN { updated = 0 }
    {
      sub(/\r$/, "", $0)
      if (index($0, key "=") == 1) {
        if (!updated) {
          print key "=" value
          updated = 1
        }
        next
      }
      print
    }
    END {
      if (!updated) print key "=" value
    }
  ' "$ENV_FILE" > "$temporary_file"
  chmod 600 "$temporary_file"
  mv -f -- "$temporary_file" "$ENV_FILE"
}

merge_missing_env_keys() {
  local example="${ROOT_DIR}/.env.example"
  local added=0
  local line key

  [[ -f "$example" && -f "$ENV_FILE" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || continue
    key="${line%%=*}"
    env_has_key "$key" && continue
    if [[ "$added" -eq 0 ]]; then
      printf '\n# Variáveis adicionadas a partir de .env.example\n' >> "$ENV_FILE"
    fi
    printf '%s\n' "$line" >> "$ENV_FILE"
    added=1
  done < "$example"
  if [[ "$added" -eq 1 ]]; then
    info "Chaves ausentes do .env.example foram acrescentadas em $ENV_FILE"
  fi
}

service_is_running() {
  local service="$1"
  [[ "$(operational_compose ps --status running --quiet "$service" 2>/dev/null)" != "" ]]
}

ensure_database_running() {
  if ! service_is_running db; then
    info "Iniciando o PostgreSQL..."
    operational_compose up -d db
  fi

  local attempt
  for attempt in $(seq 1 60); do
    if operational_compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
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
