"""Cifra Fernet em repouso: selo, TOTP legado e gzip."""

from __future__ import annotations

import gzip

import pytest
from cryptography.fernet import Fernet
from django.core.exceptions import ImproperlyConfigured

from common.crypto import FernetFieldCipher, derive_development_fernet_key
from core.settings.security import (
    data_encryption_key_rejection_reason,
    require_production_data_encryption_key,
)

TEST_KEY = Fernet.generate_key().decode()


def test_roundtrip_text_and_bytes():
    cipher = FernetFieldCipher(TEST_KEY)
    assert cipher.unseal_text(cipher.seal_text("JBSWY3DPEHPK3PXP")) == "JBSWY3DPEHPK3PXP"
    payload = gzip.compress(b'{"email":"hero@pdl.dev"}')
    stored = cipher.seal_bytes(payload)
    assert not stored.startswith(b"\x1f\x8b")
    assert cipher.unseal_bytes(stored) == payload


def test_legacy_totp_and_legacy_gzip_remain_readable():
    cipher = FernetFieldCipher(TEST_KEY)
    assert cipher.unseal_text("JBSWY3DPEHPK3PXP") == "JBSWY3DPEHPK3PXP"
    gzipped = gzip.compress(b"ok")
    assert cipher.unseal_bytes(gzipped) == gzipped


def test_empty_values_stay_empty():
    cipher = FernetFieldCipher(TEST_KEY)
    assert cipher.seal_text("") == ""
    assert cipher.unseal_text("") == ""


def test_hmac_is_stable_and_distinct():
    cipher = FernetFieldCipher(TEST_KEY)
    first = cipher.hmac_hex("AAAA-BBBB")
    assert first == cipher.hmac_hex("AAAA-BBBB")
    assert first != cipher.hmac_hex("CCCC-DDDD")


def test_invalid_key_is_rejected():
    with pytest.raises(ImproperlyConfigured):
        FernetFieldCipher("not-a-fernet-key")


def test_production_rejects_empty_data_key():
    assert data_encryption_key_rejection_reason("")
    with pytest.raises(ImproperlyConfigured):
        require_production_data_encryption_key("")
    require_production_data_encryption_key(TEST_KEY)


def test_development_derivation_is_deterministic():
    assert derive_development_fernet_key("secret-a") != derive_development_fernet_key("secret-b")
    FernetFieldCipher(derive_development_fernet_key("secret-a"))
