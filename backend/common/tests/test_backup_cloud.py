"""Backup com mídia, envio/restore pela nuvem (rclone), retenção e agendamento."""

from __future__ import annotations

import io
import os
import shutil
import stat
import subprocess
import sys
import tarfile
from pathlib import Path

import pytest

from common.tests.fake_docker import (
    bash_path,
    compose_commands,
    install_fake_backup_docker,
    install_fake_crontab,
    install_fake_rclone,
    install_fake_systemctl,
)

REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPTS = REPO_ROOT / "scripts"
BACKUP_KEY = "b" * 64
REMOTE = "fake:bucket/pdl"


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
    pytest.fail("bash é necessário para testar os scripts de backup")


def _require_openssl() -> None:
    probe = subprocess.run([_bash(), "-c", "command -v openssl"], capture_output=True, text=True, check=False)
    if probe.returncode != 0:
        pytest.skip("openssl não está disponível no bash de teste")


class Env:
    """Instalação isolada: .env, pastas de backup, Docker e rclone falsos."""

    def __init__(self, tmp_path: Path, **env_values: str):
        self.tmp = tmp_path
        self.bin_dir, self.state, self.app = install_fake_backup_docker(tmp_path)
        self.rclone, self.remote_root, self.rclone_log = install_fake_rclone(tmp_path)
        self.backup_dir = tmp_path / "backups"
        self.env_file = tmp_path / ".env"
        values = {
            "DJANGO_SETTINGS_MODULE": "core.settings.production",
            "BACKUP_ENCRYPTION_KEY": BACKUP_KEY,
            "BACKUP_REMOTE": REMOTE,
            **env_values,
        }
        self.env_file.write_text(
            "".join(f"{key}={value}\n" for key, value in values.items()),
            encoding="utf-8",
            newline="\n",
        )
        (self.app / "media" / "themes" / "valorem").mkdir(parents=True)
        (self.app / "media" / "themes" / "valorem" / "theme.css").write_text("body{}", encoding="utf-8")
        (self.app / "private" / "lgpd").mkdir(parents=True)
        (self.app / "private" / "lgpd" / "pkg.bin").write_bytes(b"encrypted-package")

    def run(self, script: str, *args: str, extra_env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        for key in ("PDL_SKIP_DOCKER", "PDL_RCLONE_BIN", "PDL_BACKUP_DIR", "PDL_ENV_FILE"):
            env.pop(key, None)
        env.update(
            {
                "PATH": f"{bash_path(self.bin_dir)}:{os.environ.get('PATH', '')}",
                "PDL_ENV_FILE": bash_path(self.env_file),
                "PDL_BACKUP_DIR": bash_path(self.backup_dir),
                "PDL_RCLONE_BIN": bash_path(self.rclone),
                "PDL_RCLONE_CONFIG": bash_path(self.tmp / "rclone" / "rclone.conf"),
            }
        )
        env.update(extra_env or {})
        return subprocess.run(
            [_bash(), bash_path(SCRIPTS / f"{script}.sh"), *args],
            env=env,
            cwd=str(REPO_ROOT),
            capture_output=True,
            encoding="utf-8",
            errors="replace",
            timeout=120,
            check=False,
        )

    def remote_dir(self) -> Path:
        return self.remote_root / "fake" / "bucket" / "pdl"

    def local_backups(self) -> list[str]:
        return sorted(p.name for p in self.backup_dir.glob("pdl_*") if not p.name.endswith((".sha256", ".env")))

    def remote_backups(self) -> list[str]:
        directory = self.remote_dir()
        if not directory.is_dir():
            return []
        return sorted(p.name for p in directory.iterdir() if not p.name.endswith(".sha256"))


def _decrypt(path: Path) -> bytes:
    result = subprocess.run(
        [
            _bash(),
            "-c",
            (
                f'BACKUP_ENCRYPTION_KEY="{BACKUP_KEY}" openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 '
                f'-in "{bash_path(path)}" -pass env:BACKUP_ENCRYPTION_KEY'
            ),
        ],
        capture_output=True,
        check=True,
    )
    return result.stdout


def _seed_old_backups(directory: Path, days: list[str]) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    for day in days:
        name = f"pdl_{day}T033000Z.tar.enc"
        (directory / name).write_bytes(b"old")
        (directory / f"{name}.sha256").write_text("x  " + name, encoding="utf-8")


def _run_retention(names: list[str], keep_daily: int, keep_weekly: int) -> list[str]:
    script = (
        f'source "{bash_path(SCRIPTS / "lib" / "common.sh")}"\n'
        f'source "{bash_path(SCRIPTS / "lib" / "backup.sh")}"\n'
        f"backup_prune_candidates {keep_daily} {keep_weekly}\n"
    )
    result = subprocess.run(
        [_bash(), "-c", script],
        input="\n".join(names) + "\n",
        capture_output=True,
        encoding="utf-8",
        check=True,
        env={**os.environ, "PDL_ENV_FILE": "/dev/null"},
    )
    return sorted(result.stdout.split())


def test_retention_keeps_newest_backup_of_recent_days_and_iso_weeks():
    names = [
        "pdl_20260928T033000Z.tar.enc",  # segunda-feira, semana ISO 40
        "pdl_20260928T010000Z.tar.enc",  # mesmo dia, mais antigo
        "pdl_20260927T033000Z.tar.enc",  # domingo, semana 39
        "pdl_20260926T033000Z.dump.enc",  # semana 39; formato antigo também entra
        "pdl_20260920T033000Z.tar.enc",  # semana 38
        "pdl_20260913T033000Z.tar.enc",  # semana 37
        "pdl_20260913T033000Z.tar.enc.sha256",
        "notas.txt",
    ]

    stale = _run_retention(names, keep_daily=2, keep_weekly=3)

    assert stale == [
        "pdl_20260913T033000Z.tar.enc",
        "pdl_20260926T033000Z.dump.enc",
        "pdl_20260928T010000Z.tar.enc",
    ]


def _run_lib(function_call: str, stdin: str) -> subprocess.CompletedProcess[str]:
    script = (
        f'source "{bash_path(SCRIPTS / "lib" / "common.sh")}"\n'
        f'source "{bash_path(SCRIPTS / "lib" / "backup.sh")}"\n'
        f"{function_call}\n"
    )
    return subprocess.run(
        [_bash(), "-c", script],
        input=stdin,
        capture_output=True,
        encoding="utf-8",
        check=False,
        env={**os.environ, "PDL_ENV_FILE": "/dev/null"},
    )


@pytest.mark.skipif(sys.platform == "win32", reason="pseudo-terminal (pty) só existe em POSIX")
def test_transfer_shows_the_progress_bar_when_run_from_a_terminal():
    import pty

    primary, secondary = pty.openpty()
    try:
        script = (
            f'source "{bash_path(SCRIPTS / "lib" / "common.sh")}"\n'
            f'source "{bash_path(SCRIPTS / "lib" / "backup.sh")}"\n'
            'mapfile -t flags < <(rclone_transfer_flags)\nprintf "%s\\n" "${flags[@]}"\n'
        )
        result = subprocess.run(
            [_bash(), "-c", script],
            stdout=subprocess.PIPE,
            stderr=secondary,
            encoding="utf-8",
            check=False,
            env={**os.environ, "PDL_ENV_FILE": "/dev/null"},
        )
    finally:
        os.close(secondary)
        os.close(primary)

    assert result.returncode == 0
    assert result.stdout.split() == ["--progress"]


@pytest.mark.parametrize(
    ("remotes", "expected"),
    [
        ("gdrive:\n", "gdrive:pdl-backups"),
        ("gdrive:\r\n", "gdrive:pdl-backups"),
        ("gdrive:\npdl-backup:\n", ""),
        ("", ""),
    ],
)
def test_destination_is_suggested_only_when_there_is_a_single_remote(remotes: str, expected: str):
    result = _run_lib("suggest_backup_destination", remotes)

    assert result.returncode == 0, result.stderr
    assert result.stdout == expected


@pytest.mark.parametrize(
    ("suggestion", "answers", "expected"),
    [
        ("gdrive:pdl-backups", "\n", "gdrive:pdl-backups"),  # Enter aceita a sugestão
        ("gdrive:pdl-backups", "r2:bucket/pdl\n", "r2:bucket/pdl"),
        ("", "\n\n  gdrive:pasta \r\n", "gdrive:pasta"),  # linhas vazias repetem a pergunta
        ("", "sem-dois-pontos\ngdrive:ok\n", "gdrive:ok"),
    ],
)
def test_destination_prompt_retries_until_it_gets_a_remote_path(suggestion: str, answers: str, expected: str):
    result = _run_lib(f'read_backup_destination "{suggestion}"', answers)

    assert result.returncode == 0, result.stderr
    assert result.stdout == expected
    assert "Destino dos backups" in result.stderr


def test_destination_prompt_gives_up_after_three_invalid_answers():
    result = _run_lib("read_backup_destination ''", "\nnada\n:sem-remote\n")

    assert result.returncode == 1
    assert result.stdout == ""
    assert "destino inválido: nada" in result.stderr


def test_backup_bundles_db_and_files_encrypts_uploads_and_prunes_both_sides(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_KEEP_DAILY="2", BACKUP_KEEP_WEEKLY="1")
    old_days = ["20250101", "20250102", "20250103"]
    _seed_old_backups(env.backup_dir, old_days)
    _seed_old_backups(env.remote_dir(), old_days)

    result = env.run("backup")

    output = result.stdout + result.stderr
    assert result.returncode == 0, output
    [created] = [name for name in env.local_backups() if not name.startswith("pdl_2025")]
    assert created.endswith(".tar.enc")
    assert (env.backup_dir / f"{created}.sha256").is_file()

    with tarfile.open(fileobj=io.BytesIO(_decrypt(env.backup_dir / created))) as bundle:
        assert sorted(bundle.getnames()) == ["db.dump", "env", "files.tar.gz", "manifest.txt"]
        manifest = bundle.extractfile("manifest.txt").read().decode()
        assert "format=pdl-backup/1" in manifest
        assert "contents=db,files,env" in manifest
        assert bundle.extractfile("env").read() == env.env_file.read_bytes()
        assert bundle.extractfile("db.dump").read() == b"PGDMP original-database\n"
        with tarfile.open(fileobj=io.BytesIO(bundle.extractfile("files.tar.gz").read())) as files:
            assert "media/themes/valorem/theme.css" in files.getnames()
            assert "private/lgpd/pkg.bin" in files.getnames()

    # Retenção 2 diários + 1 semanal: fica o novo e o mais recente dos antigos.
    assert env.local_backups() == ["pdl_20250103T033000Z.tar.enc", created]
    assert env.remote_backups() == ["pdl_20250103T033000Z.tar.enc", created]
    assert (env.remote_dir() / f"{created}.sha256").is_file()
    assert not (env.remote_dir() / "pdl_20250101T033000Z.tar.enc.sha256").exists()
    upload = next(line for line in env.rclone_log.read_text(encoding="utf-8").splitlines() if created in line)
    assert upload.startswith("copyto --stats=1m --stats-one-line --stats-log-level=NOTICE ")
    assert not list(env.backup_dir.glob(".work.*"))
    assert not (env.backup_dir / ".pdl-backup.lock").exists()


def test_backup_never_uploads_an_unencrypted_file(tmp_path: Path):
    env = Env(tmp_path, DJANGO_SETTINGS_MODULE="core.settings.development", BACKUP_ENCRYPTION_KEY="")

    result = env.run("backup")

    assert result.returncode != 0
    assert "BACKUP_ENCRYPTION_KEY" in result.stdout + result.stderr
    assert env.local_backups() == []
    assert env.remote_backups() == []


def test_backup_never_stores_the_env_without_encryption(tmp_path: Path):
    env = Env(
        tmp_path,
        DJANGO_SETTINGS_MODULE="core.settings.development",
        BACKUP_ENCRYPTION_KEY="",
        BACKUP_REMOTE="",
    )

    result = env.run("backup")

    assert result.returncode == 0, result.stdout + result.stderr
    assert "o .env não entra no backup" in result.stdout + result.stderr
    [created] = env.local_backups()
    assert created.endswith(".tar")
    with tarfile.open(env.backup_dir / created) as bundle:
        assert "env" not in bundle.getnames()
        assert "contents=db,files\n" in bundle.extractfile("manifest.txt").read().decode()


def test_backup_leaves_the_env_out_when_disabled(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_REMOTE="", BACKUP_INCLUDE_ENV="false")

    result = env.run("backup")

    assert result.returncode == 0, result.stdout + result.stderr
    [created] = env.local_backups()
    with tarfile.open(fileobj=io.BytesIO(_decrypt(env.backup_dir / created))) as bundle:
        assert sorted(bundle.getnames()) == ["db.dump", "files.tar.gz", "manifest.txt"]


def test_backup_keeps_the_local_copy_and_fails_when_the_upload_fails(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path)

    result = env.run("backup", extra_env={"FAKE_RCLONE_FAIL_COPY": "1"})

    output = result.stdout + result.stderr
    assert result.returncode != 0
    assert "envio para a nuvem falhou" in output
    assert len(env.local_backups()) == 1
    assert env.remote_backups() == []


def test_backup_db_only_keeps_the_previous_dump_format_without_files(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_REMOTE="")

    result = env.run("backup", "--db-only")

    assert result.returncode == 0, result.stdout + result.stderr
    [created] = env.local_backups()
    assert created.endswith(".dump.enc")
    assert _decrypt(env.backup_dir / created) == b"PGDMP original-database\n"
    assert not [line for line in compose_commands(env.state) if line.startswith("run ")]


def test_restore_from_cloud_brings_back_database_media_and_private_files(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path)
    assert env.run("backup").returncode == 0
    shutil.rmtree(env.backup_dir)
    (env.app / "media" / "themes" / "valorem" / "theme.css").unlink()
    (env.app / "media" / "junk.txt").write_text("after backup", encoding="utf-8")
    (env.state / "db.content").write_text("PGDMP changed-after-backup\n", encoding="utf-8")
    for service in ("backend", "asgi"):
        (env.state / f"{service}.up").touch()

    result = env.run("restore", "--from-cloud", "--force")

    output = result.stdout + result.stderr
    assert result.returncode == 0, output
    assert (env.state / "restored.dump").read_bytes() == b"PGDMP original-database\n"
    assert (env.app / "media" / "themes" / "valorem" / "theme.css").read_text(encoding="utf-8") == "body{}"
    assert not (env.app / "media" / "junk.txt").exists()
    assert (env.app / "private" / "lgpd" / "pkg.bin").read_bytes() == b"encrypted-package"
    commands = compose_commands(env.state)
    stop_at = commands.index("stop backend asgi")
    assert commands.index("up -d backend asgi") > stop_at
    assert any(line.startswith("run ") for line in commands[stop_at:])
    [downloaded] = env.local_backups()
    assert (env.backup_dir / downloaded.replace(".tar.enc", ".env")).is_file()
    assert "O .env do backup é igual ao atual." in output


def test_restore_db_only_keeps_current_files(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path)
    assert env.run("backup").returncode == 0
    (env.app / "media" / "junk.txt").write_text("keep me", encoding="utf-8")

    result = env.run("restore", "--db-only", "--force")

    assert result.returncode == 0, result.stdout + result.stderr
    assert (env.state / "restored.dump").read_bytes() == b"PGDMP original-database\n"
    assert (env.app / "media" / "junk.txt").read_text(encoding="utf-8") == "keep me"


def test_restore_from_cloud_rejects_a_corrupted_download_before_touching_data(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path)
    assert env.run("backup").returncode == 0
    [remote_name] = env.remote_backups()
    with (env.remote_dir() / remote_name).open("ab") as handle:
        handle.write(b"tampered")

    result = env.run("restore", "--from-cloud", remote_name, "--force")

    assert result.returncode != 0
    assert "checksum inválido" in result.stdout + result.stderr
    assert not (env.state / "restored.dump").exists()
    assert not [line for line in compose_commands(env.state) if line.startswith("stop ")]


def test_restore_accepts_the_previous_dump_enc_format_and_old_keys(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_REMOTE="")
    assert env.run("backup", "--db-only").returncode == 0
    [created] = env.local_backups()
    rotated = env.env_file.read_text(encoding="utf-8").replace(
        f"BACKUP_ENCRYPTION_KEY={BACKUP_KEY}",
        f"BACKUP_ENCRYPTION_KEY={'c' * 64}\nBACKUP_ENCRYPTION_KEY_FALLBACKS={BACKUP_KEY}",
    )
    env.env_file.write_text(rotated, encoding="utf-8", newline="\n")

    result = env.run("restore", "--path", bash_path(env.backup_dir / created), "--force")

    assert result.returncode == 0, result.stdout + result.stderr
    assert (env.state / "restored.dump").read_bytes() == b"PGDMP original-database\n"


def test_restore_keeps_the_current_env_and_saves_the_backup_copy(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_REMOTE="", PDL_DATA_ENCRYPTION_KEY="fernet-from-backup")
    assert env.run("backup").returncode == 0
    [created] = env.local_backups()
    original_env = env.env_file.read_bytes()
    current_env = original_env.replace(b"fernet-from-backup", b"fernet-of-new-server") + b"EXTRA_ONLY_NOW=1\n"
    env.env_file.write_bytes(current_env)

    result = env.run("restore", "--force")

    output = result.stdout + result.stderr
    assert result.returncode == 0, output
    assert env.env_file.read_bytes() == current_env
    saved = env.backup_dir / created.replace(".tar.enc", ".env")
    assert saved.read_bytes() == original_env
    assert "EXTRA_ONLY_NOW, PDL_DATA_ENCRYPTION_KEY" in output
    assert "use --env-only" in output
    assert "fernet-from-backup" not in output
    assert "fernet-of-new-server" not in output


def test_restore_env_only_from_cloud_replaces_the_env_without_touching_data(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, SECRET_KEY="secret-from-backup")
    assert env.run("backup").returncode == 0
    original_env = env.env_file.read_bytes()
    shutil.rmtree(env.backup_dir)
    fresh_env = original_env.replace(b"secret-from-backup", b"freshly-generated")
    env.env_file.write_bytes(fresh_env)
    (env.state / "commands.log").unlink()

    result = env.run("restore", "--from-cloud", "--env-only", "--force")

    output = result.stdout + result.stderr
    assert result.returncode == 0, output
    assert env.env_file.read_bytes() == original_env
    [previous] = list(tmp_path.glob(".env.before-restore-*"))
    assert previous.read_bytes() == fresh_env
    assert "SECRET_KEY" in output
    assert "freshly-generated" not in output
    assert compose_commands(env.state) == []
    assert not (env.state / "restored.dump").exists()


def test_restore_env_only_rejects_a_backup_without_env(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_REMOTE="")
    assert env.run("backup", "--db-only").returncode == 0
    before = env.env_file.read_bytes()

    result = env.run("restore", "--env-only", "--force")

    assert result.returncode != 0
    assert "não contém o .env" in result.stdout + result.stderr
    assert env.env_file.read_bytes() == before
    assert not list(tmp_path.glob(".env.before-restore-*"))


def test_restore_rejects_db_only_together_with_env_only(tmp_path: Path):
    env = Env(tmp_path, BACKUP_REMOTE="")

    result = env.run("restore", "--db-only", "--env-only", "--force")

    assert result.returncode != 0
    assert "--db-only ou --env-only" in result.stdout + result.stderr


def test_restore_refuses_to_run_unattended_without_force(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_REMOTE="")
    assert env.run("backup").returncode == 0

    result = env.run("restore")

    assert result.returncode != 0
    assert "--force" in result.stdout + result.stderr
    assert not (env.state / "restored.dump").exists()


def test_backup_removes_a_lock_left_by_a_dead_process(tmp_path: Path):
    _require_openssl()
    env = Env(tmp_path, BACKUP_REMOTE="")
    lock = env.backup_dir / ".pdl-backup.lock"
    lock.mkdir(parents=True)
    (lock / "pid").write_text("999999\n", encoding="utf-8")

    result = env.run("backup")

    assert result.returncode == 0, result.stdout + result.stderr
    assert "trava abandonada" in result.stdout + result.stderr
    assert not lock.exists()


def test_cloud_configure_r2_writes_private_rclone_config_and_probes_the_bucket(tmp_path: Path):
    env = Env(tmp_path, BACKUP_REMOTE="")

    result = env.run(
        "backup-cloud",
        "configure",
        "--provider",
        "r2",
        "--bucket",
        "saga-backups",
        "--prefix",
        "painel",
        "--access-key-id",
        "AKIA-R2",
        "--endpoint",
        "https://acc.r2.cloudflarestorage.com",
        extra_env={"PDL_BACKUP_SECRET_ACCESS_KEY": "super-secret-value"},
    )

    output = result.stdout + result.stderr
    assert result.returncode == 0, output
    config = tmp_path / "rclone" / "rclone.conf"
    text = config.read_text(encoding="utf-8")
    assert "[pdl-backup]" in text
    assert "provider = Cloudflare" in text
    assert "secret_access_key = super-secret-value" in text
    assert stat.S_IMODE(config.stat().st_mode) == 0o600 or os.name == "nt"
    assert "BACKUP_REMOTE=pdl-backup:saga-backups/painel" in env.env_file.read_text(encoding="utf-8")
    calls = env.rclone_log.read_text(encoding="utf-8")
    assert "super-secret-value" not in calls
    assert "super-secret-value" not in output
    assert "copyto" in calls and "deletefile" in calls
    assert not list((env.remote_root / "pdl-backup" / "saga-backups" / "painel").glob(".pdl-cloud-test-*"))


def test_cloud_configure_r2_requires_an_endpoint(tmp_path: Path):
    env = Env(tmp_path, BACKUP_REMOTE="")

    result = env.run(
        "backup-cloud",
        "configure",
        "--provider",
        "r2",
        "--bucket",
        "b",
        "--access-key-id",
        "id",
        extra_env={"PDL_BACKUP_SECRET_ACCESS_KEY": "s"},
    )

    assert result.returncode != 0
    assert "--endpoint" in result.stdout + result.stderr
    assert "BACKUP_REMOTE=\n" in env.env_file.read_text(encoding="utf-8")


def test_cloud_list_shows_only_backups_newest_first(tmp_path: Path):
    env = Env(tmp_path)
    _seed_old_backups(env.remote_dir(), ["20260101", "20260301"])
    (env.remote_dir() / "outro-arquivo.txt").write_text("x", encoding="utf-8")

    result = env.run("backup-cloud", "list")

    assert result.returncode == 0, result.stdout + result.stderr
    lines = [line for line in result.stdout.splitlines() if line.startswith("pdl_")]
    assert lines == ["pdl_20260301T033000Z.tar.enc", "pdl_20260101T033000Z.tar.enc"]
    assert "outro-arquivo" not in result.stdout


def test_cloud_schedule_installs_and_removes_a_systemd_timer(tmp_path: Path):
    env = Env(tmp_path)
    systemctl, systemctl_log = install_fake_systemctl(tmp_path)
    units = tmp_path / "systemd"
    scheduler_env = {"PDL_SCHEDULER": "systemd", "PDL_SYSTEMD_DIR": bash_path(units), "PDL_SYSTEMCTL": bash_path(systemctl)}

    result = env.run("backup-cloud", "schedule", "--time", "04:15", extra_env=scheduler_env)

    assert result.returncode == 0, result.stdout + result.stderr
    timer = (units / "pdl-backup.timer").read_text(encoding="utf-8")
    service = (units / "pdl-backup.service").read_text(encoding="utf-8")
    assert "OnCalendar=*-*-* 04:15:00" in timer
    assert "Persistent=true" in timer
    assert "setup.sh backup" in service
    assert f"PDL_ENV_FILE={bash_path(env.env_file)}" in service
    assert "BACKUP_SCHEDULE_TIME=04:15" in env.env_file.read_text(encoding="utf-8")
    assert systemctl_log.read_text(encoding="utf-8").splitlines() == ["daemon-reload", "enable --now pdl-backup.timer"]

    removed = env.run("backup-cloud", "unschedule", extra_env=scheduler_env)

    assert removed.returncode == 0, removed.stdout + removed.stderr
    assert not (units / "pdl-backup.timer").exists()
    assert "disable --now pdl-backup.timer" in systemctl_log.read_text(encoding="utf-8")


def test_cloud_schedule_cron_replaces_only_its_own_line(tmp_path: Path):
    env = Env(tmp_path)
    crontab, table = install_fake_crontab(tmp_path, initial="0 1 * * * /usr/local/bin/outra-tarefa\n")
    scheduler_env = {"PDL_SCHEDULER": "cron", "PDL_CRONTAB": bash_path(crontab)}

    assert env.run("backup-cloud", "schedule", extra_env=scheduler_env).returncode == 0
    result = env.run("backup-cloud", "schedule", "--time", "02:05", extra_env=scheduler_env)

    assert result.returncode == 0, result.stdout + result.stderr
    lines = table.read_text(encoding="utf-8").splitlines()
    assert lines[0] == "0 1 * * * /usr/local/bin/outra-tarefa"
    ours = [line for line in lines if "# pdl-backup" in line]
    assert len(ours) == 1
    assert ours[0].startswith("5 2 * * * ")
    assert "setup.sh backup" in ours[0]

    assert env.run("backup-cloud", "unschedule", extra_env=scheduler_env).returncode == 0
    assert table.read_text(encoding="utf-8").splitlines() == ["0 1 * * * /usr/local/bin/outra-tarefa"]


def test_cloud_schedule_rejects_an_invalid_time(tmp_path: Path):
    env = Env(tmp_path)

    result = env.run("backup-cloud", "schedule", "--time", "25:00", extra_env={"PDL_SCHEDULER": "cron"})

    assert result.returncode != 0
    assert "horário inválido" in result.stdout + result.stderr


def test_release_bundle_ships_the_cloud_backup_scripts():
    sys.path.insert(0, str(SCRIPTS))
    import pdl_release

    assert "scripts/backup-cloud.sh" in pdl_release.BUNDLE_FILES
    assert "scripts/lib/backup.sh" in pdl_release.BUNDLE_FILES
    assert "docs/tutoriais/backup-google-drive.md" in pdl_release.BUNDLE_FILES
