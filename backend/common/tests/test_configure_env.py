"""O configurador de .env só acrescenta chaves ausentes e preserva valores existentes."""

from __future__ import annotations

import os
import shutil
import stat
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
COMMON_SH = REPO_ROOT / "scripts" / "lib" / "common.sh"
CONFIGURE = REPO_ROOT / "scripts" / "configure-production.sh"


def _bash() -> str:
    for candidate in (
        Path(r"C:\Program Files\Git\bin\bash.exe"),
        Path(r"C:\Program Files\Git\usr\bin\bash.exe"),
    ):
        if candidate.is_file():
            return str(candidate)
    found = shutil.which("bash")
    if found:
        lowered = found.lower()
        if "system32" in lowered or "windowsapps" in lowered:
            pytest.skip("o bash do WSL não enxerga os scripts do repositório; use Git Bash")
        return found
    pytest.fail("bash é necessário para testar o configurador de .env")


def _bash_path(path: Path) -> str:
    posix = path.resolve().as_posix()
    if len(posix) >= 2 and posix[1] == ":":
        return f"/{posix[0].lower()}{posix[2:]}"
    return posix


def _run_merge(env_file: Path) -> subprocess.CompletedProcess[str]:
    script = f"""
set -euo pipefail
source "{COMMON_SH.as_posix()}"
merge_missing_env_keys
"""
    return subprocess.run(
        [_bash(), "-c", script],
        env={**os.environ, "PDL_ENV_FILE": _bash_path(env_file)},
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def _run_configure(env_file: Path, backup_dir: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PDL_ENV_FILE"] = _bash_path(env_file)
    env["PDL_CONFIG_BACKUP_DIR"] = _bash_path(backup_dir)
    env["PDL_SKIP_DOCKER"] = "1"
    return subprocess.run(
        [_bash(), _bash_path(CONFIGURE), *args],
        env=env,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )


def _read(env_file: Path, key: str) -> str:
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1]
    raise AssertionError(f"{key} ausente em {env_file}")


def _count(env_file: Path, key: str) -> int:
    return sum(
        1
        for line in env_file.read_text(encoding="utf-8").splitlines()
        if line.startswith(f"{key}=")
    )


def _production_stub() -> str:
    return (
        "DEBUG=false\n"
        "SECRET_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
        "DJANGO_SETTINGS_MODULE=core.settings.production\n"
        "DOMAIN=painel.example.com\n"
        "APP_BIND_ADDRESS=127.0.0.1\n"
        "APP_HTTP_PORT=9090\n"
        "DB_NAME=pdl\n"
        "DB_USER=pdl\n"
        "DB_PASSWORD=StrongProductionPass1\n"
    )


def test_merge_adds_missing_denkynho_keys_without_changing_existing_values(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "SECRET_KEY=existing-production-secret-value-with-enough-length\n"
        "DOMAIN=painel.example.com\n"
        "DENKYNHO_LLM_ENABLED=true\n",
        encoding="utf-8",
    )

    result = _run_merge(env_file)

    assert result.returncode == 0, result.stdout + result.stderr
    assert _read(env_file, "SECRET_KEY") == "existing-production-secret-value-with-enough-length"
    assert _read(env_file, "DOMAIN") == "painel.example.com"
    assert _read(env_file, "DENKYNHO_LLM_ENABLED") == "true"
    assert _read(env_file, "DENKYNHO_LLM_PROVIDER") == "ollama"
    assert _count(env_file, "DENKYNHO_LLM_API_URL") == 1
    assert _count(env_file, "DENKYNHO_LLM_API_KEY") == 1
    assert "openai/gpt-oss" not in env_file.read_text(encoding="utf-8")


def test_merge_does_not_duplicate_empty_or_present_keys(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        "DENKYNHO_LLM_API_KEY=\n"
        "DENKYNHO_LLM_PROVIDER=remote\n"
        "DENKYNHO_LLM_API_URL=https://api.groq.com/openai/v1\n",
        encoding="utf-8",
    )

    result = _run_merge(env_file)

    assert result.returncode == 0, result.stdout + result.stderr
    assert _count(env_file, "DENKYNHO_LLM_API_KEY") == 1
    assert _read(env_file, "DENKYNHO_LLM_API_KEY") == ""
    assert _read(env_file, "DENKYNHO_LLM_PROVIDER") == "remote"
    assert _read(env_file, "DENKYNHO_LLM_API_URL") == "https://api.groq.com/openai/v1"


def test_configure_production_adds_missing_keys_and_keeps_llm_off(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text(_production_stub() + "DENKYNHO_LLM_ENABLED=false\n", encoding="utf-8")
    backup_dir = tmp_path / "backups"

    result = _run_configure(env_file, backup_dir, "-y")

    assert result.returncode == 0, result.stdout + result.stderr
    assert _read(env_file, "DOMAIN") == "painel.example.com"
    assert _read(env_file, "APP_BIND_ADDRESS") == "127.0.0.1"
    assert _read(env_file, "APP_HTTP_PORT") == "9090"
    assert _read(env_file, "SECRET_KEY") == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    assert _read(env_file, "DB_PASSWORD") == "StrongProductionPass1"
    assert _read(env_file, "DENKYNHO_LLM_ENABLED") == "false"
    assert _read(env_file, "DENKYNHO_LLM_PROVIDER") == "ollama"
    assert _read(env_file, "DENKYNHO_EMBEDDINGS_ENABLED") == "false"
    assert _count(env_file, "DENKYNHO_LLM_API_KEY") == 1


def test_configure_production_preserves_existing_embeddings_flag(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        _production_stub() + "DENKYNHO_EMBEDDINGS_ENABLED=true\n",
        encoding="utf-8",
    )

    result = _run_configure(env_file, tmp_path / "backups", "-y")

    assert result.returncode == 0, result.stdout + result.stderr
    assert _read(env_file, "DENKYNHO_EMBEDDINGS_ENABLED") == "true"


def test_configure_production_enables_remote_without_clobbering_domain(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text(_production_stub() + "DENKYNHO_LLM_ENABLED=false\n", encoding="utf-8")

    result = _run_configure(
        env_file,
        tmp_path / "backups",
        "-y",
        "--denkynho-provider",
        "remote",
        "--denkynho-api-url",
        "https://api.groq.com/openai/v1",
        "--denkynho-api-key",
        "gsk-test-not-for-logs",
        "--denkynho-model",
        "openai/gpt-oss-20b",
    )

    output = result.stdout + result.stderr
    assert result.returncode == 0, output
    assert "gsk-test-not-for-logs" not in output
    assert _read(env_file, "DOMAIN") == "painel.example.com"
    assert _read(env_file, "APP_BIND_ADDRESS") == "127.0.0.1"
    assert _read(env_file, "APP_HTTP_PORT") == "9090"
    assert _read(env_file, "SECRET_KEY") == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    assert _read(env_file, "DB_PASSWORD") == "StrongProductionPass1"
    assert _read(env_file, "DENKYNHO_LLM_ENABLED") == "true"
    assert _read(env_file, "DENKYNHO_LLM_PROVIDER") == "remote"
    assert _read(env_file, "DENKYNHO_LLM_API_URL") == "https://api.groq.com/openai/v1"
    assert _read(env_file, "DENKYNHO_LLM_API_KEY") == "gsk-test-not-for-logs"
    assert _read(env_file, "DENKYNHO_LLM_MODEL") == "openai/gpt-oss-20b"


def test_configure_production_rejects_remote_without_model_when_still_on_ollama(tmp_path: Path):
    env_file = tmp_path / ".env"
    original = (
        _production_stub()
        + "DENKYNHO_LLM_PROVIDER=ollama\n"
        + "DENKYNHO_LLM_MODEL=qwen3.5:4b\n"
    )
    env_file.write_text(original, encoding="utf-8")

    result = _run_configure(
        env_file,
        tmp_path / "backups",
        "-y",
        "--denkynho-provider",
        "remote",
        "--denkynho-api-url",
        "https://api.groq.com/openai/v1",
    )

    assert result.returncode != 0
    assert "denkynho-model" in (result.stdout + result.stderr)
    assert env_file.read_text(encoding="utf-8") == original
    assert _read(env_file, "DENKYNHO_LLM_PROVIDER") == "ollama"
    assert _read(env_file, "DENKYNHO_LLM_MODEL") == "qwen3.5:4b"


def test_configure_production_writes_a_config_backup(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text(_production_stub(), encoding="utf-8")
    backup_dir = tmp_path / "backups"

    result = _run_configure(env_file, backup_dir, "-y")

    assert result.returncode == 0, result.stdout + result.stderr
    backups = list(backup_dir.glob("env.*.backup"))
    assert len(backups) == 1
    mode = stat.S_IMODE(backups[0].stat().st_mode)
    assert mode == 0o600 or os.name == "nt"
