"""O comando único ./setup.sh ftp gera o vsftpd.conf sem tocar em apt/systemctl."""

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
    pytest.fail("bash é necessário para testar ./setup.sh ftp")


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
        [_bash(), _bash_path(SCRIPTS / "ftp.sh"), *args],
        env=merged,
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def test_ftp_help_lists_the_single_command():
    help_result = _run("--help")
    description = _run("--description")
    assert help_result.returncode == 0, help_result.stdout + help_result.stderr
    assert description.returncode == 0, description.stdout + description.stderr
    assert "./setup.sh ftp" in help_result.stdout
    assert "--http" in help_result.stdout
    assert "vsftpd.conf" in help_result.stdout
    assert "ftp" in description.stdout.lower()


def test_ftp_dry_run_prints_resolved_options():
    result = _run(
        "--dry-run",
        "--dir",
        "/var/www/launcher",
        "--user",
        "launcher",
        "--http",
        "--domain",
        "launcher.l2saga.club",
        "--ssl",
        "--no-email",
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert "dir=/var/www/launcher" in result.stdout
    assert "user=launcher" in result.stdout
    assert "pasv=40000-50000" in result.stdout
    assert "http=1" in result.stdout
    assert "domain=launcher.l2saga.club" in result.stdout


def test_ftp_write_config_is_one_vsftpd_file(tmp_path: Path):
    target = tmp_path / "vsftpd.conf"
    result = _run(
        "--dir",
        "/srv/launcher",
        "--user",
        "patcher",
        "--pasv-min",
        "41000",
        "--pasv-max",
        "42000",
        "--yes",
        "--write-config",
        _bash_path(target),
    )
    assert result.returncode == 0, result.stdout + result.stderr
    text = target.read_text(encoding="utf-8")
    assert "local_root=/srv/launcher" in text
    assert "pasv_min_port=41000" in text
    assert "pasv_max_port=42000" in text
    assert "chroot_local_user=YES" in text
    assert "anonymous_enable=NO" in text
    assert "ssl_enable=NO" in text
    assert "{{" not in text
    assert "patcher" in text or "launcher" in text


def test_ftp_write_config_ftps_keeps_tls_options_in_the_same_file(tmp_path: Path):
    target = tmp_path / "vsftpd.conf"
    result = _run(
        "--ftps",
        "--ftps-cert",
        "/etc/ssl/custom.pem",
        "--ftps-key",
        "/etc/ssl/custom.key",
        "--yes",
        "--write-config",
        _bash_path(target),
    )
    assert result.returncode == 0, result.stdout + result.stderr
    text = target.read_text(encoding="utf-8")
    assert "ssl_enable=YES" in text
    assert "rsa_cert_file=/etc/ssl/custom.pem" in text
    assert "ssl_enable=NO" not in text


def test_ftp_write_http_config_lists_the_same_directory(tmp_path: Path):
    target = tmp_path / "launcher.conf"
    result = _run(
        "--http",
        "--domain",
        "launcher.example.com",
        "--dir",
        "/var/www/launcher",
        "--ssl",
        "--no-email",
        "--yes",
        "--write-http-config",
        _bash_path(target),
    )
    assert result.returncode == 0, result.stdout + result.stderr
    text = target.read_text(encoding="utf-8")
    assert "server_name launcher.example.com;" in text
    assert "root /var/www/launcher;" in text
    assert "autoindex on;" in text
    assert "listen 443 ssl;" in text
    assert "return 301 https://$host$request_uri;" in text


def test_ftp_skip_system_writes_conf_and_optional_nginx_site(tmp_path: Path):
    ftp_dir = tmp_path / "files"
    nginx_root = tmp_path / "nginx"
    vsftpd = tmp_path / "vsftpd.conf"
    result = _run(
        "--yes",
        "--dir",
        _bash_path(ftp_dir),
        "--user",
        "launcher",
        "--http",
        "--domain",
        "dl.example.com",
        env={
            "PDL_SKIP_SYSTEM": "1",
            "PDL_VSFTPD_CONF": _bash_path(vsftpd),
            "PDL_NGINX_ROOT": _bash_path(nginx_root),
            "PDL_NGINX_WEB_ROOT": _bash_path(tmp_path / "www"),
        },
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert ftp_dir.is_dir()
    assert "local_root=" in vsftpd.read_text(encoding="utf-8")
    site = (nginx_root / "sites-available" / "pdlpro-launcher").read_text(encoding="utf-8")
    assert "server_name dl.example.com;" in site
    assert (nginx_root / "sites-enabled" / "pdlpro-launcher").exists()


def test_ftp_rejects_an_invalid_user():
    result = _run("--user", "Root", "--yes", "--write-config", "/tmp/pdl-ftp-invalid.conf")
    output = result.stdout + result.stderr
    assert result.returncode != 0
    assert "root" in output.lower()
