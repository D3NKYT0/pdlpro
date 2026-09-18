"""Os settings de produção recusam iniciar com SECRET_KEY previsível."""

from __future__ import annotations

import importlib

import pytest
from cryptography.fernet import Fernet
from django.core.exceptions import ImproperlyConfigured

from core.settings.security import (
    MINIMUM_SECRET_KEY_LENGTH,
    require_production_secret_key,
    secret_key_rejection_reason,
)

STRONG_KEY = "9f" * 40
FERNET_KEY = Fernet.generate_key().decode()


def test_strong_key_is_accepted_without_explanation():
    assert secret_key_rejection_reason(STRONG_KEY) is None
    require_production_secret_key(STRONG_KEY)


@pytest.mark.parametrize(
    "secret_key",
    [
        "",
        "   ",
        "django-insecure-change-me-with-fifty-characters-or-more-here",
        "change-me-to-a-long-random-string-at-least-50-chars",
        "DJANGO-INSECURE-" + "a" * 60,
        "a" * (MINIMUM_SECRET_KEY_LENGTH - 1),
    ],
)
def test_weak_keys_are_explained_and_refused(secret_key):
    reason = secret_key_rejection_reason(secret_key)

    assert reason
    with pytest.raises(ImproperlyConfigured) as error:
        require_production_secret_key(secret_key)
    assert reason in str(error.value)
    assert "configure-production" in str(error.value)


def _load_production_settings():
    # ``production`` faz ``from .base import *``: sem recarregar a base, SECRET_KEY continuaria
    # com o valor lido no início da sessão de testes.
    importlib.reload(importlib.import_module("core.settings.base"))
    return importlib.reload(importlib.import_module("core.settings.production"))


def test_importing_production_settings_fails_with_the_example_secret_key(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", "django-insecure-change-me-in-production-right-now")
    monkeypatch.setenv("PDL_DATA_ENCRYPTION_KEY", FERNET_KEY)

    with pytest.raises(ImproperlyConfigured):
        _load_production_settings()


def test_importing_production_settings_succeeds_with_a_strong_secret_key(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", STRONG_KEY)
    monkeypatch.setenv("PDL_DATA_ENCRYPTION_KEY", FERNET_KEY)

    production = _load_production_settings()

    assert production.SECRET_KEY == STRONG_KEY
    assert production.DEBUG is False
    assert production.REST_AUTH["JWT_AUTH_SECURE"] is True
    assert production.OPENAPI_DOCS_PUBLIC is False
    assert "'unsafe-inline'" not in production.CONTENT_SECURITY_POLICY.split("style-src")[0]


def test_production_keeps_openapi_docs_private_even_when_env_enables_them(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", STRONG_KEY)
    monkeypatch.setenv("PDL_DATA_ENCRYPTION_KEY", FERNET_KEY)
    monkeypatch.setenv("OPENAPI_DOCS_PUBLIC", "true")

    production = _load_production_settings()

    assert production.OPENAPI_DOCS_PUBLIC is False


def test_importing_production_settings_fails_without_data_encryption_key(monkeypatch):
    monkeypatch.setenv("SECRET_KEY", STRONG_KEY)
    monkeypatch.setenv("PDL_DATA_ENCRYPTION_KEY", "")

    with pytest.raises(ImproperlyConfigured) as error:
        _load_production_settings()
    assert "PDL_DATA_ENCRYPTION_KEY" in str(error.value)
