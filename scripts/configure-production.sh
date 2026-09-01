#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

show_help() {
  cat <<'EOF'
Configura o .env de producao e gerencia a rotacao de segredos.

Uso:
  ./setup.sh configure-production [opcoes]

Opcoes:
  --domain DOMINIO          Dominio publico (padrao: pdl.denky.dev.br).
  --bind-address IP         IP HTTP local (padrao: 0.0.0.0).
  --port PORTA              Porta do proxy reverso (padrao: 8080).
  --rotate-secrets          Rotaciona SECRET_KEY e DB_PASSWORD.
  --rotate-secret-key       Rotaciona somente a SECRET_KEY.
  --rotate-db-password      Rotaciona somente a senha PostgreSQL.
  -y, --yes                 Nao solicita confirmacao.
  -h, --help                Exibe esta ajuda.

Sem flags de rotacao, segredos fortes existentes sao preservados. Valores
ausentes, curtos ou padroes de desenvolvimento sao substituidos. Se o banco de
producao ja existir, a senha do role PostgreSQL e atualizada de forma coordenada.
EOF
}

if [[ "${1:-}" == "--description" ]]; then
  printf 'Configura producao e rotaciona segredos com rollback'
  exit 0
fi

domain="pdl.denky.dev.br"
bind_address="0.0.0.0"
http_port="8080"
rotate_secret_key=0
rotate_db_password=0
assume_yes=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain)
      [[ $# -ge 2 ]] || die "--domain exige um valor"
      domain="$2"
      shift
      ;;
    --bind-address)
      [[ $# -ge 2 ]] || die "--bind-address exige um valor"
      bind_address="$2"
      shift
      ;;
    --port)
      [[ $# -ge 2 ]] || die "--port exige um valor"
      http_port="$2"
      shift
      ;;
    --rotate-secrets)
      rotate_secret_key=1
      rotate_db_password=1
      ;;
    --rotate-secret-key) rotate_secret_key=1 ;;
    --rotate-db-password) rotate_db_password=1 ;;
    -y|--yes) assume_yes=1 ;;
    -h|--help) show_help; exit 0 ;;
    *) die "opcao desconhecida para configure-production: $1" ;;
  esac
  shift
done

[[ "$domain" =~ ^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$ ]] || die "dominio invalido: $domain"
[[ "$bind_address" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || die "IP de bind invalido: $bind_address"
[[ "$http_port" =~ ^[0-9]+$ ]] || die "porta invalida: $http_port"
(( http_port >= 1 && http_port <= 65535 )) || die "a porta deve estar entre 1 e 65535"

ensure_env_file

generate_hex() {
  local byte_count="$1"
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex "$byte_count"
  elif command -v od >/dev/null 2>&1; then
    od -An -N "$byte_count" -tx1 /dev/urandom | tr -d ' \n'
  else
    die "openssl ou od e necessario para gerar segredos"
  fi
}

is_weak_value() {
  local value="$1"
  local minimum_length="$2"
  [[ ${#value} -lt "$minimum_length" || "$value" == change-me-* || "$value" == "pdl" || "$value" =~ [[:space:]] ]]
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

wait_for_database() {
  local attempt
  for attempt in $(seq 1 60); do
    if production_compose exec -T db sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"' >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

alter_database_password() {
  local database_user="$1"
  local database_name="$2"
  local password="$3"
  local escaped_password

  escaped_password="${password//\'/\'\'}"
  printf 'ALTER ROLE "%s" WITH PASSWORD '\''%s'\'';\n' "$database_user" "$escaped_password" |
    production_compose exec -T db \
      psql -v ON_ERROR_STOP=1 -U "$database_user" -d "$database_name" >/dev/null
}

current_secret_key="$(read_env_value SECRET_KEY)"
current_db_password="$(read_env_value DB_PASSWORD)"
database_user="$(read_env_value DB_USER)"
database_name="$(read_env_value DB_NAME)"
database_user="${database_user:-pdl}"
database_name="${database_name:-pdl}"

[[ "$database_user" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || die "DB_USER invalido no .env"
[[ "$database_name" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] || die "DB_NAME invalido no .env"

if is_weak_value "$current_secret_key" 50; then
  rotate_secret_key=1
fi
if is_weak_value "$current_db_password" 16 || [[ ! "$current_db_password" =~ ^[a-zA-Z0-9._~-]+$ ]]; then
  rotate_db_password=1
fi

if [[ "$assume_yes" -ne 1 ]]; then
  if [[ ! -t 0 ]]; then
    die "execucao nao interativa exige --yes"
  fi
  printf '\nDominio: https://%s\n' "$domain"
  printf 'Proxy reverso: http://%s:%s\n' "$bind_address" "$http_port"
  [[ "$rotate_secret_key" -eq 1 ]] && printf 'SECRET_KEY: sera gerada novamente\n'
  [[ "$rotate_db_password" -eq 1 ]] && printf 'DB_PASSWORD: sera rotacionada\n'
  printf '\nContinuar? [s/N] '
  read -r answer
  [[ "$answer" =~ ^[sS]$ ]] || die "configuracao cancelada"
fi

backup_dir="${PDL_CONFIG_BACKUP_DIR:-${ROOT_DIR}/backups/config}"
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
backup_path="$(mktemp "${backup_dir}/env.$(date -u +'%Y%m%dT%H%M%SZ').XXXXXX.backup")"
cp -p -- "$ENV_FILE" "$backup_path"
chmod 600 "$backup_path"

new_secret_key="$current_secret_key"
new_db_password="$current_db_password"
[[ "$rotate_secret_key" -eq 1 ]] && new_secret_key="$(generate_hex 64)"
[[ "$rotate_db_password" -eq 1 ]] && new_db_password="$(generate_hex 32)"

database_container=""
database_started_for_rotation=0
database_password_changed=0
services_to_recreate=()
docker_ready=0

rollback_on_failure() {
  local status=$?
  trap - EXIT

  if [[ "$status" -ne 0 ]]; then
    warn "Falha durante a configuracao; iniciando rollback..."
    if [[ "$database_password_changed" -eq 1 ]]; then
      alter_database_password "$database_user" "$database_name" "$current_db_password" ||
        warn "nao foi possivel restaurar automaticamente a senha PostgreSQL"
    fi
    cp -p -- "$backup_path" "$ENV_FILE" || true
    chmod 600 "$ENV_FILE" 2>/dev/null || true
    if [[ ${#services_to_recreate[@]} -gt 0 ]]; then
      production_compose up -d --no-deps --force-recreate "${services_to_recreate[@]}" ||
        warn "nao foi possivel recriar todos os servicos com a configuracao anterior"
    fi
    if [[ "$database_started_for_rotation" -eq 1 ]]; then
      production_compose stop db || warn "nao foi possivel restaurar o estado parado do PostgreSQL"
    fi
    warn "O .env anterior foi restaurado."
  fi

  unset current_secret_key current_db_password new_secret_key new_db_password
  exit "$status"
}
trap rollback_on_failure EXIT

if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  docker_ready=1
  database_container="$(production_compose ps --all --quiet db 2>/dev/null || true)"

  for service in backend asgi celery_worker web; do
    if [[ -n "$(production_compose ps --status running --quiet "$service" 2>/dev/null)" ]]; then
      services_to_recreate+=("$service")
    fi
  done

  if [[ "$rotate_db_password" -eq 1 ]]; then
    if [[ -z "$database_container" ]]; then
      info "Preparando o PostgreSQL para sincronizar a nova senha..."
      production_compose up -d db
      database_container="$(production_compose ps --all --quiet db)"
      database_started_for_rotation=1
    fi

    if [[ -z "$(production_compose ps --status running --quiet db 2>/dev/null)" ]]; then
      info "Iniciando o PostgreSQL para rotacionar a senha..."
      production_compose start db
      database_started_for_rotation=1
    fi
    wait_for_database || die "PostgreSQL nao ficou pronto para a rotacao"
    info "Atualizando a senha do role PostgreSQL..."
    alter_database_password "$database_user" "$database_name" "$new_db_password"
    database_password_changed=1
  fi
fi

if [[ "$rotate_db_password" -eq 1 && "$docker_ready" -ne 1 ]]; then
  die "Docker precisa estar instalado e em execucao para sincronizar DB_PASSWORD"
fi

set_env_value DEBUG false
set_env_value SECRET_KEY "$new_secret_key"
set_env_value DJANGO_SETTINGS_MODULE core.settings.production
set_env_value ALLOWED_HOSTS "$domain"
set_env_value CORS_ALLOWED_ORIGINS "https://${domain}"
set_env_value CSRF_TRUSTED_ORIGINS "https://${domain}"
set_env_value OPENAPI_DOCS_PUBLIC false

set_env_value DB_NAME "$database_name"
set_env_value DB_USER "$database_user"
set_env_value DB_PASSWORD "$new_db_password"
set_env_value DATABASE_URL "postgres://${database_user}:${new_db_password}@db:5432/${database_name}"
set_env_value REDIS_URL redis://redis:6379/0

set_env_value DOMAIN "$domain"
set_env_value APP_BIND_ADDRESS "$bind_address"
set_env_value APP_HTTP_PORT "$http_port"
set_env_value PROJECT_URL "https://${domain}"
set_env_value FRONTEND_URL "https://${domain}"
set_env_value PAYMENT_WEBHOOK_BASE_URL "https://${domain}"
set_env_value WEBAUTHN_RP_ID "$domain"
set_env_value WEBAUTHN_ORIGINS "https://${domain}"
set_env_value VAPID_SUBJECT "mailto:noreply@${domain}"
set_env_value DEFAULT_FROM_EMAIL "noreply@${domain}"

set_env_value GUNICORN_RELOAD false
set_env_value RUN_MIGRATIONS true
set_env_value RUN_COLLECTSTATIC true
set_env_value PAYMENT_ALLOW_MOCK false
set_env_value PAYMENT_MOCK_AUTO_CONFIRM false
chmod 600 "$ENV_FILE"

if [[ ${#services_to_recreate[@]} -gt 0 ]]; then
  info "Recriando servicos que consomem a configuracao..."
  production_compose up -d --no-deps --force-recreate "${services_to_recreate[@]}"
fi

if [[ "$database_started_for_rotation" -eq 1 ]]; then
  production_compose stop db
fi

trap - EXIT
unset current_secret_key current_db_password new_secret_key new_db_password

success "Configuracao de producao salva em $ENV_FILE"
info "Dominio publico: https://${domain}"
info "Destino do proxy reverso: http://${bind_address}:${http_port}"
info "Backup anterior: $backup_path"
if [[ "$rotate_secret_key" -eq 1 || "$rotate_db_password" -eq 1 ]]; then
  info "Segredos rotacionados sem serem exibidos. Sessoes existentes podem ter sido invalidadas."
else
  info "Segredos fortes existentes foram preservados."
fi
info "Proximo passo: ./setup.sh install --production"
