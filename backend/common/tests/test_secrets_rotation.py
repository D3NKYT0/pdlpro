"""MultiFernet, fingerprints e soft-rotate da SECRET_KEY no configurador."""

from __future__ import annotations

from cryptography.fernet import Fernet

from common.crypto import FernetFieldCipher
from common.secrets_env import EnvFile, fingerprint, push_fallback
from common.tests.test_configure_env import _production_stub, _read, _run_configure


def test_multifernet_reads_old_key_and_seals_with_primary():
    old = Fernet.generate_key().decode()
    new = Fernet.generate_key().decode()
    legacy = FernetFieldCipher(old).seal_text("JBSWY3DPEHPK3PXP")
    cipher = FernetFieldCipher(new, [old], hmac_key="stable-hmac-material-32bytes!!")
    assert cipher.unseal_text(legacy) == "JBSWY3DPEHPK3PXP"
    assert cipher.needs_reseal_text(legacy)
    refreshed = cipher.seal_text(cipher.unseal_text(legacy))
    assert not cipher.needs_reseal_text(refreshed)


def test_fingerprint_is_stable_and_short():
    assert fingerprint("abc") == fingerprint("abc")
    assert fingerprint("abc") != fingerprint("abd")
    assert len(fingerprint("abc")) == 12


def test_env_file_write_many_is_atomic(tmp_path):
    path = tmp_path / ".env"
    path.write_text("A=1\nB=2\n", encoding="utf-8")
    EnvFile(path).write_many({"B": "9", "C": "3"})
    text = path.read_text(encoding="utf-8")
    assert "A=1" in text
    assert "B=9" in text
    assert "C=3" in text


def test_configure_production_soft_rotates_secret_into_fallbacks(tmp_path):
    fernet = "MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA="
    backup_key = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    env_file = tmp_path / ".env"
    env_file.write_text(
        _production_stub()
        + f"PDL_DATA_ENCRYPTION_KEY={fernet}\n"
        + f"BACKUP_ENCRYPTION_KEY={backup_key}\n",
        encoding="utf-8",
    )

    result = _run_configure(env_file, tmp_path / "backups", "-y", "--rotate-secret-key")

    assert result.returncode == 0, result.stdout + result.stderr
    assert _read(env_file, "SECRET_KEY") != "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    assert "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" in _read(
        env_file, "SECRET_KEY_FALLBACKS"
    )
    assert _read(env_file, "PDL_DATA_ENCRYPTION_KEY") == fernet
    assert _read(env_file, "BACKUP_ENCRYPTION_KEY") == backup_key
    assert len(_read(env_file, "SECRET_KEY_ROTATED_AT")) >= 10
    assert len(_read(env_file, "PDL_DATA_HMAC_KEY")) >= 32


def test_configure_production_prunes_secret_fallbacks(tmp_path):
    env_file = tmp_path / ".env"
    env_file.write_text(
        _production_stub()
        + "SECRET_KEY_FALLBACKS=oldkeyoneoldkeyoneoldkeyoneoldkeyoneoldkeyone\n"
        + "PDL_DATA_ENCRYPTION_KEY=MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA=\n"
        + "BACKUP_ENCRYPTION_KEY=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
        encoding="utf-8",
    )

    result = _run_configure(env_file, tmp_path / "backups", "-y", "--prune-secret-fallbacks")

    assert result.returncode == 0, result.stdout + result.stderr
    assert _read(env_file, "SECRET_KEY_FALLBACKS") == ""
    assert _read(env_file, "SECRET_KEY") == "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"


def test_push_fallback_caps_and_dedupes():
    assert push_fallback("a", ["a", "b", "c"], maximum=2) == ["a", "b"]
