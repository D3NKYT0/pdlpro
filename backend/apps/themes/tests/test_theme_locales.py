import pytest

from apps.themes.application.theme_locales import (
    parse_theme_locale,
    resolve_locale_files,
    validate_theme_locale,
)
from common.architecture.exceptions import ValidationDomainError


def test_validate_theme_locale_accepts_known_namespaces():
    payload = validate_theme_locale(
        {
            "auth": {"login": {"title": "Entre no Valorem"}},
            "public": {"footer": {"tagline": "Reino aberto"}},
        },
        path="locales/pt.json",
    )
    assert payload["auth"]["login"]["title"] == "Entre no Valorem"


def test_validate_theme_locale_rejects_unknown_namespace_or_empty():
    with pytest.raises(ValidationDomainError, match="namespaces desconhecidos"):
        validate_theme_locale({"shop": {"title": "Loja"}}, path="locales/pt.json")
    with pytest.raises(ValidationDomainError, match="não vazio"):
        validate_theme_locale({}, path="locales/pt.json")
    with pytest.raises(ValidationDomainError, match="string vazia"):
        validate_theme_locale({"auth": {"login": {"title": "  "}}}, path="locales/pt.json")


def test_parse_theme_locale_rejects_invalid_json():
    with pytest.raises(ValidationDomainError, match="JSON UTF-8"):
        parse_theme_locale(b"{not-json", path="locales/en.json")


def test_resolve_locale_files_requires_pointer_and_at_least_one_file():
    files = {"locales/pt.json": b'{"auth":{"login":{"title":"Oi"}}}'}
    with pytest.raises(ValidationDomainError, match="quando theme.json aponta"):
        resolve_locale_files({}, files)

    with pytest.raises(ValidationDomainError, match="nenhum locales"):
        resolve_locale_files({"locales": "locales"}, {})

    with pytest.raises(ValidationDomainError, match='pasta "locales"'):
        resolve_locale_files({"locales": "i18n"}, files)

    bundles = resolve_locale_files({"locales": "locales"}, files)
    assert bundles["pt"]["auth"]["login"]["title"] == "Oi"
