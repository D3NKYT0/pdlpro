#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="${ROOT_DIR}/scripts"

fail() {
  printf 'Erro: %s\n' "$*" >&2
  exit 1
}

discover_commands() {
  local script

  [[ -d "$SCRIPTS_DIR" ]] || return 0

  for script in "$SCRIPTS_DIR"/*.sh; do
    [[ -f "$script" ]] || continue
    printf '%s\n' "$(basename "$script" .sh)"
  done | LC_ALL=C sort
}

command_exists() {
  local command_name="$1"
  [[ "$command_name" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]] &&
    [[ -f "${SCRIPTS_DIR}/${command_name}.sh" ]]
}

command_description() {
  local script="$1"
  local description

  description="$(bash "$script" --description 2>/dev/null || true)"
  if [[ -n "$description" ]]; then
    printf '%s' "$description"
  else
    printf 'Sem descrição'
  fi
}

show_help() {
  local command_name script

  cat <<'EOF'
PDL PRO - utilitário de configuração e operação

Uso:
  ./setup.sh <comando> [argumentos]
  ./setup.sh help [comando]
  ./setup.sh list

Comandos disponíveis:
EOF

  while IFS= read -r command_name; do
    [[ -n "$command_name" ]] || continue
    script="${SCRIPTS_DIR}/${command_name}.sh"
    printf '  %-14s %s\n' "$command_name" "$(command_description "$script")"
  done < <(discover_commands)

  cat <<'EOF'

Use "./setup.sh help <comando>" para ver as opções de um comando.
Novos arquivos scripts/<comando>.sh são descobertos automaticamente.
EOF
}

[[ -d "$SCRIPTS_DIR" ]] || fail "diretório de scripts não encontrado: $SCRIPTS_DIR"

command_name="${1:-help}"
if [[ $# -gt 0 ]]; then
  shift
fi

case "$command_name" in
  help|-h|--help)
    if [[ $# -gt 0 ]]; then
      command_exists "$1" || fail "comando desconhecido: $1"
      exec bash "${SCRIPTS_DIR}/$1.sh" --help
    fi
    show_help
    ;;
  list)
    discover_commands
    ;;
  *)
    command_exists "$command_name" || {
      printf 'Erro: comando desconhecido: %s\n\n' "$command_name" >&2
      show_help >&2
      exit 1
    }
    cd "$ROOT_DIR"
    exec bash "${SCRIPTS_DIR}/${command_name}.sh" "$@"
    ;;
esac
