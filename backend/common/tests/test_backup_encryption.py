"""Algoritmo openssl dos dumps cifrados (AES-256-CBC + PBKDF2)."""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


def test_openssl_backup_roundtrip(tmp_path: Path):
    openssl = shutil.which("openssl")
    if openssl is None:
        git_openssl = Path(r"C:\Program Files\Git\usr\bin\openssl.exe")
        openssl = str(git_openssl) if git_openssl.is_file() else None
    if not openssl:
        import pytest

        pytest.skip("openssl é necessário para conferir o algoritmo do backup")

    src = tmp_path / "pdl.dump"
    src.write_bytes(b"PGDMP\x00fake-catalog")
    enc = tmp_path / "pdl.dump.enc"
    out = tmp_path / "restored.dump"
    env = {**os.environ, "BACKUP_ENCRYPTION_KEY": "unit-test-backup-key-32bytes!!"}
    subprocess.run(
        [
            openssl,
            "enc",
            "-aes-256-cbc",
            "-pbkdf2",
            "-iter",
            "200000",
            "-salt",
            "-in",
            str(src),
            "-out",
            str(enc),
            "-pass",
            "env:BACKUP_ENCRYPTION_KEY",
        ],
        env=env,
        check=True,
        capture_output=True,
    )
    assert enc.read_bytes()[:8] == b"Salted__"
    subprocess.run(
        [
            openssl,
            "enc",
            "-d",
            "-aes-256-cbc",
            "-pbkdf2",
            "-iter",
            "200000",
            "-in",
            str(enc),
            "-out",
            str(out),
            "-pass",
            "env:BACKUP_ENCRYPTION_KEY",
        ],
        env=env,
        check=True,
        capture_output=True,
    )
    assert out.read_bytes() == src.read_bytes()
