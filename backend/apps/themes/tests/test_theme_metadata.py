import pytest

from apps.themes.application.theme_metadata import (
    flatten_theme_metadata,
    validate_theme_metadata,
)
from common.architecture.exceptions import ValidationDomainError


def test_validate_theme_metadata_accepts_partial_contract():
    payload = validate_theme_metadata(
        {
            "schemaVersion": 1,
            "site": {"name": "Cruma"},
            "seo": {"ogImage": "images/favicon.png"},
        },
        {"images/favicon.png": "images/favicon.png"},
    )
    assert payload["site"]["name"] == "Cruma"
    assert payload["seo"]["ogImage"] == "images/favicon.png"


def test_validate_theme_metadata_rejects_unknown_or_unsafe_fields():
    with pytest.raises(ValidationDomainError, match="desconhecidas"):
        validate_theme_metadata({"extra": True}, {})
    with pytest.raises(ValidationDomainError, match="HTTPS"):
        validate_theme_metadata(
            {"social": {"discordUrl": "http://discord.gg/x"}},
            {},
        )
    with pytest.raises(ValidationDomainError, match="YouTube"):
        validate_theme_metadata({"social": {"trailerYoutubeId": "short"}}, {})
    with pytest.raises(ValidationDomainError, match="assets"):
        validate_theme_metadata({"seo": {"ogImage": "images/missing.png"}}, {})


def test_flatten_theme_metadata_resolves_og_image_from_assets():
    overlay = flatten_theme_metadata(
        {
            "site": {"name": "Cruma"},
            "seo": {"title": "Cruma SEO", "ogImage": "images/favicon.png"},
            "social": {"discordUrl": "https://discord.gg/cruma"},
            "server": {"rates": {"xp": "x10"}},
        },
        {"images/favicon.png": "/media/themes/cruma/images/favicon.png"},
    )
    assert overlay["name"] == "Cruma"
    assert overlay["seo_title"] == "Cruma SEO"
    assert overlay["og_image"] == "/media/themes/cruma/images/favicon.png"
    assert overlay["rates"]["xp"] == "x10"
