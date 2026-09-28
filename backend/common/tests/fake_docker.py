"""Docker falso para testar os scripts de instalação sem containers reais.

Registra cada chamada `docker compose ...` em `<state>/commands.log`, marca
serviços como em execução com arquivos `<state>/<serviço>.up` e recusa o
Compose quando `REDIS_PASSWORD` está vazia, como o Compose real faz ao
interpolar `docker-compose.prod.yml`.
"""

from __future__ import annotations

from pathlib import Path


def bash_path(path: Path) -> str:
    posix = path.resolve().as_posix()
    if len(posix) >= 2 and posix[1] == ":":
        return f"/{posix[0].lower()}{posix[2:]}"
    return posix


def install_fake_compose_docker(tmp_path: Path, running: tuple[str, ...] = ()) -> tuple[Path, Path]:
    """Cria `bin/docker` e devolve (diretório do binário, diretório de estado)."""
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir()
    state_dir = tmp_path / "fake-docker-state"
    state_dir.mkdir()
    for service in running:
        (state_dir / f"{service}.up").touch()
    docker = bin_dir / "docker"
    docker.write_text(
        f"""#!/usr/bin/env bash
set -euo pipefail
STATE="{bash_path(state_dir)}"
if [[ "${{1:-}}" == "info" ]]; then
  exit 0
fi
if [[ "${{1:-}}" == "--version" ]]; then
  printf 'Docker version 27.0.0\\n'
  exit 0
fi
if [[ "${{1:-}}" == "compose" && "${{2:-}}" == "version" ]]; then
  printf 'Docker Compose version v2.29.0\\n'
  exit 0
fi
if [[ "${{1:-}}" != "compose" ]]; then
  printf 'unexpected docker %s\\n' "$*" >&2
  exit 1
fi
shift
env_file=""
args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file)
      env_file="$2"
      shift 2
      ;;
    --project-directory|-f|--file)
      shift 2
      ;;
    *)
      args+=("$1")
      shift
      ;;
  esac
done
redis_pw=""
if [[ -n "$env_file" && -f "$env_file" ]]; then
  redis_pw="$(awk -F= '$1 == "REDIS_PASSWORD" {{ sub(/\\r$/, "", $2); print $2; exit }}' "$env_file")"
fi
if [[ -z "$redis_pw" ]]; then
  printf 'error while interpolating services.redis.command: required variable REDIS_PASSWORD is missing a value: REDIS_PASSWORD is required\\n' >&2
  exit 1
fi
printf '%s\\n' "${{args[*]}}" >> "$STATE/commands.log"
set -- "${{args[@]}}"
service="${{!#}}"
case "$1" in
  ps)
    if [[ -f "$STATE/${{service}}.up" ]]; then
      printf 'container-%s\\n' "$service"
    fi
    exit 0
    ;;
  up|start)
    : > "$STATE/${{service}}.up"
    exit 0
    ;;
  exec|stop|pull)
    exit 0
    ;;
esac
printf 'unexpected compose %s\\n' "$*" >&2
exit 1
""",
        encoding="utf-8",
        newline="\n",
    )
    docker.chmod(docker.stat().st_mode | 0o111)
    return bin_dir, state_dir


def compose_commands(state_dir: Path) -> list[str]:
    log = state_dir / "commands.log"
    if not log.is_file():
        return []
    return log.read_text(encoding="utf-8").splitlines()
