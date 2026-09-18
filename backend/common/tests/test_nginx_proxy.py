"""O comando único ./setup.sh nginx gera o site sem tocar em apt/systemctl."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / "scripts"


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
    pytest.fail("bash é necessário para testar ./setup.sh nginx")


def _bash_path(path: Path) -> str:
    posix = path.resolve().as_posix()
    if len(posix) >= 2 and posix[1] == ":":
        return f"/{posix[0].lower()}{posix[2:]}"
    return posix


def _run(*args: str, env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
    merged = os.environ.copy()
    if env:
        merged.update(env)
    return subprocess.run(
        [_bash(), _bash_path(SCRIPTS / "nginx.sh"), *args],
        env=merged,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def test_nginx_help_lists_the_single_command_and_the_site_file():
    help_result = _run("--help")
    description = _run("--description")
    assert help_result.returncode == 0, help_result.stdout + help_result.stderr
    assert description.returncode == 0, description.stdout + description.stderr
    assert "./setup.sh nginx" in help_result.stdout
    assert "--ssl" in help_result.stdout
    assert "--www" in help_result.stdout
    assert "scripts/nginx/" in help_result.stdout
    assert "nginx" in description.stdout.lower()


def test_nginx_dry_run_prints_resolved_options():
    result = _run(
        "--dry-run",
        "--domain",
        "l2saga.club",
        "--port",
        "8080",
        "--ssl",
        "--www",
        "--channel",
        "mainline",
        "--no-email",
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "domain=l2saga.club" in result.stdout
    assert "upstream=127.0.0.1:8080" in result.stdout
    assert "ssl=1" in result.stdout
    assert "www=1" in result.stdout
    assert "channel=mainline" in result.stdout


def test_nginx_rejects_an_unknown_channel():
    result = _run("--channel", "nightly", "--yes", "--domain", "painel.example.com")
    assert result.returncode != 0
    assert "channel" in (result.stdout + result.stderr).lower()


def test_nginx_write_config_http_keeps_proxy_on_port_80(tmp_path: Path):
    target = tmp_path / "pdlpro.conf"
    result = _run(
        "--domain",
        "l2saga.club",
        "--port",
        "8080",
        "--yes",
        "--write-config",
        _bash_path(target),
    )
    assert result.returncode == 0, result.stdout + result.stderr
    text = target.read_text(encoding="utf-8")
    assert "server_name l2saga.club;" in text
    assert "listen 80;" in text
    assert "listen 443" not in text
    assert "proxy_pass http://127.0.0.1:8080;" in text
    assert "location /ws/" in text
    assert "acme-challenge" in text
    assert "return 444;" in text
    assert "6085" not in text
    assert "{{" not in text


def test_nginx_write_config_ssl_is_one_file_with_redirect_and_https(tmp_path: Path):
    target = tmp_path / "pdlpro.conf"
    result = _run(
        "--domain",
        "l2saga.club",
        "--www",
        "--ssl",
        "--no-email",
        "--yes",
        "--write-config",
        _bash_path(target),
    )
    assert result.returncode == 0, result.stdout + result.stderr
    text = target.read_text(encoding="utf-8")
    assert "server_name l2saga.club www.l2saga.club;" in text
    assert "return 301 https://$host$request_uri;" in text
    assert "listen 443 ssl;" in text
    assert "ssl_certificate     /etc/letsencrypt/live/l2saga.club/fullchain.pem;" in text
    assert "X-Forwarded-Proto https;" in text
    assert text.count("location /ws/") == 1
    assert "{{#ssl}}" not in text


def test_nginx_reads_domain_and_port_from_env(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text("DOMAIN=painel.example.com\nAPP_HTTP_PORT=9090\n", encoding="utf-8")
    nginx_root = tmp_path / "nginx"
    web_root = tmp_path / "www"
    result = _run(
        "--yes",
        env={
            "PDL_ENV_FILE": _bash_path(env_file),
            "PDL_NGINX_ROOT": _bash_path(nginx_root),
            "PDL_NGINX_WEB_ROOT": _bash_path(web_root),
            "PDL_SKIP_SYSTEM": "1",
        },
    )
    assert result.returncode == 0, result.stdout + result.stderr
    site = (nginx_root / "sites-available" / "pdlpro").read_text(encoding="utf-8")
    assert "server_name painel.example.com;" in site
    assert "proxy_pass http://127.0.0.1:9090;" in site
    assert (nginx_root / "sites-enabled" / "pdlpro").exists()


def test_nginx_rejects_an_invalid_domain():
    result = _run("--domain", "localhost", "--yes", "--write-config", "/tmp/pdl-nginx-invalid.conf")
    output = result.stdout + result.stderr
    assert result.returncode != 0
    assert "localhost" in output
    assert "ERRO" in output or "erro" in output.lower()
