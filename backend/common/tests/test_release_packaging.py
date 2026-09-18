"""Pacote de release, imagens GHCR e instaladores da versão publicada."""

from __future__ import annotations

import os
import shutil
import stat
import subprocess
import sys
import zipfile
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

import pdl_release


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
    pytest.fail("bash é necessário para testar o empacotamento e o instalador")


def _bash_path(path: Path) -> str:
    posix = path.resolve().as_posix()
    if len(posix) >= 2 and posix[1] == ":":
        return f"/{posix[0].lower()}{posix[2:]}"
    return posix


def _clean_env() -> dict[str, str]:
    merged = os.environ.copy()
    for key in (
        "PDL_ENV_FILE",
        "PDL_CONFIG_BACKUP_DIR",
        "PDL_SKIP_DOCKER",
        "PDL_SKIP_CHECKSUM",
        "PDL_RELEASE_BUNDLE",
        "PDL_RELEASE_API_URL",
        "PDL_INSTALL_DRY_RUN",
        "PDL_INSTALL_DIR",
    ):
        merged.pop(key, None)
    return merged


def _run_bash(script: str, env: dict[str, str] | None = None, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    merged = _clean_env()
    if env:
        merged.update(env)
    return subprocess.run(
        [_bash(), "-c", script],
        env=merged,
        cwd=str(cwd or REPO_ROOT),
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )


def _read_env(path: Path, key: str) -> str:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1]
    raise AssertionError(f"{key} ausente em {path}")


def test_normalize_version_accepts_semver_and_rejects_garbage():
    assert pdl_release.normalize_version("v2.4.0") == "2.4.0"
    assert pdl_release.normalize_version("2.4.0") == "2.4.0"
    assert pdl_release.release_tag("2.4.0") == "v2.4.0"
    with pytest.raises(ValueError):
        pdl_release.normalize_version("main")
    with pytest.raises(ValueError):
        pdl_release.normalize_version("../etc")


def test_image_and_github_urls_use_version_and_repo():
    images = pdl_release.image_names("2.4.0")
    assert images["backend"] == "ghcr.io/d3nkyt0/pdlpro/backend:2.4.0"
    assert images["web"] == "ghcr.io/d3nkyt0/pdlpro/web:2.4.0"
    urls = pdl_release.github_release_urls("v2.4.0", "D3NKYT0/pdlpro")
    assert urls["tag"] == "v2.4.0"
    assert urls["bundle"].endswith("/releases/download/v2.4.0/pdl-pro-2.4.0.zip")
    assert urls["install_sh"].endswith("/install.sh")
    assert pdl_release.parse_latest_tag('{"tag_name": "v2.4.0"}') == "2.4.0"


def test_strip_compose_build_keeps_services_and_image_vars():
    prod = (REPO_ROOT / "docker-compose.prod.yml").read_text(encoding="utf-8")
    rendered = pdl_release.render_release_compose(prod)
    assert "build:" not in rendered
    assert "${PDL_BACKEND_IMAGE:-pdl_backend:local}" in rendered
    assert "${PDL_WEB_IMAGE:-pdl_web:local}" in rendered
    assert pdl_release.compose_service_names(prod) == pdl_release.compose_service_names(rendered)
    assert "backend" in pdl_release.compose_service_names(rendered)
    assert "web" in pdl_release.compose_service_names(rendered)


def test_pack_release_zip_contains_installer_without_application_source(tmp_path: Path):
    artifacts = pdl_release.pack_release(root=REPO_ROOT, output_dir=tmp_path, version="2.4.0")
    bundle = artifacts["bundle"]
    checksum = artifacts["checksum"]
    assert bundle.name == "pdl-pro-2.4.0.zip"
    digest = pdl_release.sha256_file(bundle)
    assert checksum.read_text(encoding="utf-8").startswith(digest)
    with zipfile.ZipFile(bundle) as archive:
        names = set(archive.namelist())
        assert "pdl-pro-2.4.0/setup.sh" in names
        assert "pdl-pro-2.4.0/docker-compose.prod.yml" in names
        assert "pdl-pro-2.4.0/packaging/install.sh" in names
        assert "pdl-pro-2.4.0/scripts/configure-production.ps1" in names
        assert "pdl-pro-2.4.0/scripts/nginx.sh" in names
        assert "pdl-pro-2.4.0/scripts/lib/nginx.sh" in names
        assert "pdl-pro-2.4.0/scripts/nginx/pdlpro.conf.template" in names
        assert not any(name.startswith("pdl-pro-2.4.0/backend/") for name in names)
        assert not any(name.startswith("pdl-pro-2.4.0/frontend/src/") for name in names)
        compose = archive.read("pdl-pro-2.4.0/docker-compose.prod.yml").decode("utf-8")
        assert "build:" not in compose
        assert "PDL_BACKEND_IMAGE" in compose


def test_apply_published_images_and_deploy_policy(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text("DOMAIN=painel.example.com\n", encoding="utf-8")
    script = f"""
set -euo pipefail
source "{_bash_path(SCRIPTS / "lib" / "common.sh")}"
apply_published_release_images 2.4.0
uses_published_images
build=""
pull=0
resolve_deploy_image_policy
printf 'build=%s\\n' "$build"
printf 'pull=%s\\n' "$pull"
"""
    result = _run_bash(script, env={"PDL_ENV_FILE": _bash_path(env_file)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert _read_env(env_file, "PDL_BACKEND_IMAGE") == "ghcr.io/d3nkyt0/pdlpro/backend:2.4.0"
    assert _read_env(env_file, "PDL_WEB_IMAGE") == "ghcr.io/d3nkyt0/pdlpro/web:2.4.0"
    assert _read_env(env_file, "PDL_IMAGE_PULL_POLICY") == "always"
    assert "build=0" in result.stdout
    assert "pull=1" in result.stdout


def test_source_deploy_still_builds_when_images_are_local(tmp_path: Path):
    env_file = tmp_path / ".env"
    env_file.write_text("PDL_BACKEND_IMAGE=pdl_backend:local\n", encoding="utf-8")
    script = f"""
set -euo pipefail
source "{_bash_path(SCRIPTS / "lib" / "common.sh")}"
if uses_published_images; then echo published; else echo source; fi
build=""
pull=0
resolve_deploy_image_policy
printf 'build=%s\\n' "$build"
"""
    result = _run_bash(script, env={"PDL_ENV_FILE": _bash_path(env_file)})
    assert result.returncode == 0, result.stdout + result.stderr
    assert "source" in result.stdout
    assert "build=1" in result.stdout


def test_require_project_files_accepts_release_tree_without_dev_compose(tmp_path: Path):
    lib = tmp_path / "scripts" / "lib"
    lib.mkdir(parents=True)
    shutil.copyfile(SCRIPTS / "lib" / "common.sh", lib / "common.sh")
    (tmp_path / "docker-compose.prod.yml").write_text("services: {}\n", encoding="utf-8")
    script = f"""
set -euo pipefail
source "{_bash_path(lib / "common.sh")}"
require_project_files
require_production_files
"""
    result = _run_bash(script, env={"PDL_ENV_FILE": _bash_path(tmp_path / ".env")})
    assert result.returncode == 0, result.stdout + result.stderr

    (tmp_path / "docker-compose.prod.yml").unlink()
    missing = _run_bash(script, env={"PDL_ENV_FILE": _bash_path(tmp_path / ".env")})
    assert missing.returncode != 0
    assert "docker-compose" in (missing.stdout + missing.stderr)


def test_install_sh_dry_run_and_invalid_version():
    installer = REPO_ROOT / "packaging" / "install.sh"
    dry = subprocess.run(
        [_bash(), _bash_path(installer), "--version", "v2.4.0", "--dir", "/tmp/pdl", "--domain", "painel.example.com", "--yes"],
        env={**_clean_env(), "PDL_INSTALL_DRY_RUN": "1"},
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert dry.returncode == 0, dry.stdout + dry.stderr
    assert "version=2.4.0" in dry.stdout
    assert "pdl-pro-2.4.0.zip" in dry.stdout
    assert "ghcr.io/d3nkyt0/pdlpro" in dry.stdout

    bad = subprocess.run(
        [_bash(), _bash_path(installer), "--version", "main", "--yes", "--domain", "painel.example.com"],
        env={**_clean_env(), "PDL_INSTALL_DRY_RUN": "1"},
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    output = bad.stdout + bad.stderr
    assert bad.returncode != 0
    assert "ERRO" in output
    assert "main" in output


def test_install_sh_extracts_local_bundle_and_writes_images(tmp_path: Path):
    artifacts = pdl_release.pack_release(root=REPO_ROOT, output_dir=tmp_path / "dist", version="2.4.0")
    dest = tmp_path / "install"
    installer = REPO_ROOT / "packaging" / "install.sh"
    result = subprocess.run(
        [
            _bash(),
            _bash_path(installer),
            "--version",
            "2.4.0",
            "--dir",
            _bash_path(dest),
            "--domain",
            "painel.example.com",
            "--yes",
            "--no-start",
            "--skip-docker",
            "--skip-checksum",
        ],
        env={
            **_clean_env(),
            "PDL_RELEASE_BUNDLE": artifacts["bundle"].resolve().as_posix(),
            "PDL_SKIP_DOCKER": "1",
            "PDL_SKIP_CHECKSUM": "1",
            "PDL_CONFIG_BACKUP_DIR": _bash_path(tmp_path / "backups"),
        },
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    assert (dest / "setup.sh").is_file()
    assert (dest / "docker-compose.prod.yml").is_file()
    assert not (dest / "backend").exists()
    env_file = dest / ".env"
    assert _read_env(env_file, "DOMAIN") == "painel.example.com"
    assert _read_env(env_file, "DJANGO_SETTINGS_MODULE") == "core.settings.production"
    assert _read_env(env_file, "PDL_BACKEND_IMAGE") == "ghcr.io/d3nkyt0/pdlpro/backend:2.4.0"
    assert _read_env(env_file, "PDL_WEB_IMAGE") == "ghcr.io/d3nkyt0/pdlpro/web:2.4.0"
    assert len(_read_env(env_file, "SECRET_KEY")) >= 50
    mode = stat.S_IMODE(env_file.stat().st_mode)
    assert mode == 0o600 or os.name == "nt"


def test_install_sh_preserves_existing_env(tmp_path: Path):
    artifacts = pdl_release.pack_release(root=REPO_ROOT, output_dir=tmp_path / "dist", version="2.4.0")
    dest = tmp_path / "install"
    dest.mkdir()
    (dest / ".env").write_text(
        "SECRET_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
        "DB_PASSWORD=StrongProductionPass1\n"
        "DOMAIN=old.example.com\n"
        "DJANGO_SETTINGS_MODULE=core.settings.production\n"
        "APP_BIND_ADDRESS=127.0.0.1\n"
        "APP_HTTP_PORT=9090\n"
        "DB_NAME=pdl\n"
        "DB_USER=pdl\n"
        "DEBUG=false\n",
        encoding="utf-8",
    )
    installer = REPO_ROOT / "packaging" / "install.sh"
    result = subprocess.run(
        [
            _bash(),
            _bash_path(installer),
            "--version",
            "2.4.0",
            "--dir",
            _bash_path(dest),
            "--domain",
            "painel.example.com",
            "--yes",
            "--no-start",
            "--skip-docker",
            "--skip-checksum",
        ],
        env={
            **_clean_env(),
            "PDL_RELEASE_BUNDLE": artifacts["bundle"].resolve().as_posix(),
            "PDL_SKIP_DOCKER": "1",
            "PDL_SKIP_CHECKSUM": "1",
            "PDL_CONFIG_BACKUP_DIR": _bash_path(tmp_path / "backups"),
        },
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    assert result.returncode == 0, result.stdout + result.stderr
    env_file = dest / ".env"
    assert _read_env(env_file, "SECRET_KEY") == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    assert _read_env(env_file, "DB_PASSWORD") == "StrongProductionPass1"
    assert _read_env(env_file, "DOMAIN") == "painel.example.com"
    assert _read_env(env_file, "PDL_BACKEND_IMAGE") == "ghcr.io/d3nkyt0/pdlpro/backend:2.4.0"


def _powershell() -> str | None:
    for name in ("powershell", "pwsh"):
        found = shutil.which(name)
        if found:
            return found
    return None


def test_install_ps1_dry_run_and_production_script_contract(tmp_path: Path):
    shell = _powershell()
    if not shell:
        pytest.skip("PowerShell não está disponível")
    installer = REPO_ROOT / "packaging" / "install.ps1"
    dry = subprocess.run(
        [
            shell,
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(installer),
            "-Version",
            "v2.4.0",
            "-InstallDir",
            str(tmp_path / "pdl"),
            "-Domain",
            "painel.example.com",
            "-Yes",
        ],
        env={**_clean_env(), "PDL_INSTALL_DRY_RUN": "1"},
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )
    assert dry.returncode == 0, dry.stdout + dry.stderr
    assert "version=2.4.0" in dry.stdout
    assert "pdl-pro-2.4.0.zip" in dry.stdout

    configure = (REPO_ROOT / "scripts" / "configure-production.ps1").read_text(encoding="utf-8")
    for key in (
        "DJANGO_SETTINGS_MODULE",
        "SECRET_KEY",
        "DB_PASSWORD",
        "WEBAUTHN_RP_ID",
        "PAYMENT_ALLOW_MOCK",
        "PDL_DATA_ENCRYPTION_KEY",
        "BACKUP_ENCRYPTION_KEY",
    ):
        assert f"'{key}'" in configure
    assert "-Yes" in configure
    assert "[Console]" not in configure

    backup = (REPO_ROOT / "scripts" / "backup.sh").read_text(encoding="utf-8")
    restore = (REPO_ROOT / "scripts" / "restore.sh").read_text(encoding="utf-8")
    assert "aes-256-cbc" in backup
    assert "BACKUP_ENCRYPTION_KEY" in backup
    assert ".dump.enc" in restore
    assert "aes-256-cbc" in restore
