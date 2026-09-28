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


def _write_executable(path: Path, body: str) -> Path:
    path.write_text(body, encoding="utf-8", newline="\n")
    path.chmod(path.stat().st_mode | 0o111)
    return path


def install_fake_backup_docker(tmp_path: Path, running: tuple[str, ...] = ("db",)) -> tuple[Path, Path, Path]:
    """Docker falso para backup/restore.

    `pg_dump` devolve o conteúdo de `<state>/db.content`; `pg_restore --list`
    exige o cabeçalho PGDMP; o restore grava o stdin em `<state>/restored.dump`.
    `compose run ... backend -c SCRIPT` executa o script de verdade trocando
    `/app` por `<tmp>/app`. Devolve (bin, estado, app).
    """
    bin_dir = tmp_path / "bin"
    bin_dir.mkdir(exist_ok=True)
    state_dir = tmp_path / "fake-docker-state"
    state_dir.mkdir(exist_ok=True)
    app_dir = tmp_path / "app"
    app_dir.mkdir(exist_ok=True)
    (state_dir / "db.content").write_text("PGDMP original-database\n", encoding="utf-8", newline="\n")
    for service in running:
        (state_dir / f"{service}.up").touch()
    _write_executable(
        bin_dir / "docker",
        f"""#!/usr/bin/env bash
set -euo pipefail
STATE="{bash_path(state_dir)}"
APP="{bash_path(app_dir)}"
case "${{1:-}}" in
  info) exit 0 ;;
  --version) printf 'Docker version 27.0.0\\n'; exit 0 ;;
esac
if [[ "${{1:-}}" == "compose" && "${{2:-}}" == "version" ]]; then
  printf 'Docker Compose version v2.29.0\\n'
  exit 0
fi
[[ "${{1:-}}" == "compose" ]] || {{ printf 'unexpected docker %s\\n' "$*" >&2; exit 1; }}
shift
args=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env-file|--project-directory|-f|--file) shift 2 ;;
    *) args+=("$1"); shift ;;
  esac
done
printf '%s\\n' "${{args[*]:0:6}}" >> "$STATE/commands.log"
set -- "${{args[@]}}"
case "$1" in
  ps)
    service="${{!#}}"
    [[ -f "$STATE/${{service}}.up" ]] && printf 'container-%s\\n' "$service"
    exit 0
    ;;
  up)
    shift
    for service in "$@"; do
      [[ "$service" == -* ]] || : > "$STATE/${{service}}.up"
    done
    exit 0
    ;;
  stop)
    shift
    for service in "$@"; do rm -f "$STATE/${{service}}.up"; done
    exit 0
    ;;
  exec)
    script="${{!#}}"
    case "$script" in
      *pg_isready*) exit 0 ;;
      *pg_dump*) cat "$STATE/db.content"; exit 0 ;;
      *"pg_restore --list"*)
        header="$(head -c 5)"
        cat >/dev/null
        [[ "$header" == "PGDMP" ]] || {{ echo "pg_restore: input file is not a valid archive" >&2; exit 1; }}
        exit 0
        ;;
      *"pg_restore -U"*) cat > "$STATE/restored.dump"; exit 0 ;;
    esac
    ;;
  run)
    while [[ $# -gt 0 && "$1" != "-c" ]]; do shift; done
    [[ $# -ge 2 ]] || {{ echo "run sem -c" >&2; exit 1; }}
    script="${{2//\\/app/$APP}}"
    shift 2
    exec bash -c "$script" "$@"
    ;;
esac
printf 'unexpected compose %s\\n' "$*" >&2
exit 1
""",
    )
    return bin_dir, state_dir, app_dir


def install_fake_rclone(tmp_path: Path) -> tuple[Path, Path, Path]:
    """rclone falso: `nome:caminho` vira `<tmp>/remote/nome/caminho`.

    Devolve (executável, raiz dos remotes, log de chamadas). Com
    FAKE_RCLONE_FAIL_COPY=1 o `copyto` para a nuvem falha.
    """
    remote_root = tmp_path / "remote"
    remote_root.mkdir()
    log = tmp_path / "rclone.log"
    script = _write_executable(
        tmp_path / "fake-rclone",
        f"""#!/usr/bin/env bash
set -euo pipefail
ROOT="{bash_path(remote_root)}"
LOG="{bash_path(log)}"
map() {{
  if [[ "$1" =~ ^([A-Za-z][A-Za-z0-9_-]+):(.*)$ ]]; then
    printf '%s/%s/%s' "$ROOT" "${{BASH_REMATCH[1]}}" "${{BASH_REMATCH[2]#/}}"
  else
    printf '%s' "$1"
  fi
}}
is_remote() {{ [[ "$1" =~ ^[A-Za-z][A-Za-z0-9_-]+: ]]; }}
[[ "${{1:-}}" == "--config" ]] && shift 2
printf '%s\\n' "$*" >> "$LOG"
command="$1"
shift
case "$command" in
  copyto)
    if is_remote "$2" && [[ "${{FAKE_RCLONE_FAIL_COPY:-0}}" == "1" ]]; then
      echo "fake rclone: upload failed" >&2
      exit 1
    fi
    source_path="$(map "$1")"
    target_path="$(map "$2")"
    [[ -f "$source_path" ]] || {{ echo "fake rclone: object not found" >&2; exit 3; }}
    mkdir -p "$(dirname "$target_path")"
    cp "$source_path" "$target_path"
    ;;
  lsf)
    [[ "${{1:-}}" == "--files-only" ]] && shift
    dir="$(map "$1")"
    [[ -d "$dir" ]] || exit 0
    find "$dir" -maxdepth 1 -type f -exec basename {{}} \\; | LC_ALL=C sort
    ;;
  deletefile)
    rm -f "$(map "$1")"
    ;;
  config)
    ;;
  *)
    echo "fake rclone: unexpected $command" >&2
    exit 1
    ;;
esac
""",
    )
    return script, remote_root, log


def install_fake_systemctl(tmp_path: Path) -> tuple[Path, Path]:
    log = tmp_path / "systemctl.log"
    script = _write_executable(
        tmp_path / "fake-systemctl",
        f"""#!/usr/bin/env bash
printf '%s\\n' "$*" >> "{bash_path(log)}"
""",
    )
    return script, log


def install_fake_crontab(tmp_path: Path, initial: str = "") -> tuple[Path, Path]:
    table = tmp_path / "crontab.txt"
    if initial:
        table.write_text(initial, encoding="utf-8", newline="\n")
    script = _write_executable(
        tmp_path / "fake-crontab",
        f"""#!/usr/bin/env bash
TABLE="{bash_path(table)}"
case "${{1:-}}" in
  -l) [[ -f "$TABLE" ]] || {{ echo "no crontab for user" >&2; exit 1; }}; cat "$TABLE" ;;
  -) content="$(cat)"; printf '%s\\n' "$content" > "$TABLE" ;;
  *) echo "fake crontab: unexpected $*" >&2; exit 1 ;;
esac
""",
    )
    return script, table


def compose_commands(state_dir: Path) -> list[str]:
    log = state_dir / "commands.log"
    if not log.is_file():
        return []
    return log.read_text(encoding="utf-8").splitlines()
