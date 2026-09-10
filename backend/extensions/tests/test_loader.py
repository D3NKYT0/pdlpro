"""Testes do carregador de extensões (sem instalar apps no Django)."""

from __future__ import annotations

import pytest

from extensions.loader import (
    is_extension_app_name,
    merge_extension_apps,
    parse_extension_apps,
)


def test_parse_extension_apps_from_comma_string():
    assert parse_extension_apps(
        "extensions.acme.apps.AcmeConfig, extensions.beta.apps.BetaConfig"
    ) == [
        "extensions.acme.apps.AcmeConfig",
        "extensions.beta.apps.BetaConfig",
    ]


def test_parse_extension_apps_empty():
    assert parse_extension_apps(None) == []
    assert parse_extension_apps("") == []
    assert parse_extension_apps([]) == []


def test_parse_extension_apps_rejects_core_paths():
    with pytest.raises(ValueError, match="extensions"):
        parse_extension_apps("apps.wallet.apps.WalletConfig")


def test_merge_extension_apps_deduplicates():
    core = ["apps.wallet.apps.WalletConfig"]
    extra = [
        "extensions.acme.apps.AcmeConfig",
        "apps.wallet.apps.WalletConfig",
        "extensions.acme.apps.AcmeConfig",
    ]
    assert merge_extension_apps(core, extra) == [
        "apps.wallet.apps.WalletConfig",
        "extensions.acme.apps.AcmeConfig",
    ]


def test_is_extension_app_name():
    assert is_extension_app_name("extensions.acme") is True
    assert is_extension_app_name("extensions._example") is False
    assert is_extension_app_name("apps.wallet") is False
