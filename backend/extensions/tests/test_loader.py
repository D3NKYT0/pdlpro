"""Testes do carregador de extensões (sem instalar apps no Django)."""

from __future__ import annotations

import pytest

from extensions.loader import (
    discover_extension_locale_paths,
    is_extension_app_name,
    lineage_query_roots,
    merge_extension_apps,
    parse_extension_apps,
    query_root_for_app,
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


def test_query_root_for_app_requires_queries_directory(tmp_path):
    assert query_root_for_app(tmp_path) is None
    queries = tmp_path / "infrastructure" / "lineage" / "queries"
    queries.mkdir(parents=True)
    assert query_root_for_app(tmp_path) == queries


def test_discover_extension_locale_paths(tmp_path):
    (tmp_path / "acme" / "locale").mkdir(parents=True)
    (tmp_path / "skipme").mkdir()
    paths = discover_extension_locale_paths(tmp_path)
    assert paths == [tmp_path / "acme" / "locale"]


def test_lineage_query_roots_skips_core_apps():
    roots = lineage_query_roots()
    for root in roots:
        assert "extensions" in root.parts
        assert root.name == "queries"
