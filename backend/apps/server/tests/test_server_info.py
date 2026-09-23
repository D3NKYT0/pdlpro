from datetime import UTC, datetime

import pytest
from rest_framework.test import APIClient

from apps.server.infrastructure.models import IndexConfig


@pytest.mark.django_db
def test_public_server_info_is_classic_lineage_page():
    api = APIClient()
    response = api.get("/api/v1/public/server/info/")
    assert response.status_code == 200
    assert response.data["chronicle"]
    assert "xp" in response.data["rates"]
    assert "safe" in response.data["enchant"]
    assert response.data["max_level"] >= 1
    assert response.data["features"]
    assert response.data["coming_soon"] is False
    assert response.data["coming_soon_show_info"] is False
    assert response.data["coming_soon_show_champions"] is True
    assert response.data["whatsapp_url"] == ""
    assert response.data["facebook_url"] == ""
    assert response.data["instagram_url"] == ""
    assert response.data["youtube_url"] == ""
    assert response.data["coming_soon_at"] is None


@pytest.mark.django_db
def test_public_server_info_exposes_coming_soon_launch_fields():
    IndexConfig.objects.create(
        name="Imperium",
        coming_soon=True,
        coming_soon_show_info=True,
        coming_soon_show_champions=False,
        coming_soon_title="O portal se abre",
        coming_soon_subtitle="Prepare-se",
        coming_soon_at=datetime(2027, 1, 3, 18, 0, tzinfo=UTC),
        whatsapp_url="https://wa.me/5511999999999",
        facebook_url="https://facebook.com/imperium",
        instagram_url="https://instagram.com/imperium",
        youtube_url="https://youtube.com/@imperium",
        is_active=True,
    )
    response = APIClient().get("/api/v1/public/server/info/")
    assert response.status_code == 200
    assert response.data["coming_soon"] is True
    assert response.data["coming_soon_show_info"] is True
    assert response.data["coming_soon_show_champions"] is False
    assert response.data["coming_soon_title"] == "O portal se abre"
    assert response.data["coming_soon_subtitle"] == "Prepare-se"
    assert response.data["coming_soon_at"].startswith("2027-01-03T18:00:00")
    assert response.data["whatsapp_url"] == "https://wa.me/5511999999999"
    assert response.data["facebook_url"] == "https://facebook.com/imperium"
    assert response.data["instagram_url"] == "https://instagram.com/imperium"
    assert response.data["youtube_url"] == "https://youtube.com/@imperium"
    assert response.data["name"] == "Imperium"
    assert response.data["slogan"] == ""


@pytest.mark.django_db
def test_public_server_info_exposes_panel_identity_on_coming_soon():
    IndexConfig.objects.create(
        name="The One",
        slogan="O Número Um",
        description="O melhor servidor do mundo",
        chronicle="Interlude",
        max_level=77,
        rates={"xp": "x10", "sp": "x10", "adena": "x5", "drop": "x3", "spoil": "x3"},
        enchant={"safe": "+3", "max": "+16"},
        coming_soon=True,
        coming_soon_title="Em breve",
        coming_soon_subtitle="",
        coming_soon_at=datetime(2027, 1, 3, 18, 0, tzinfo=UTC),
        is_active=True,
    )
    response = APIClient().get("/api/v1/public/server/info/")
    assert response.status_code == 200
    assert response.data["name"] == "The One"
    assert response.data["slogan"] == "O Número Um"
    assert response.data["description"] == "O melhor servidor do mundo"
    assert response.data["chronicle"] == "Interlude"
    assert response.data["max_level"] == 77
    assert response.data["rates"]["xp"] == "x10"
    assert response.data["enchant"]["max"] == "+16"
    assert response.data["coming_soon"] is True
    assert response.data["coming_soon_subtitle"] == "O Número Um"


@pytest.mark.django_db
def test_public_server_info_exposes_seo_and_social_from_admin(settings):
    settings.SITE_SEO_TITLE = "Env SEO"
    settings.DISCORD_URL = "https://discord.gg/env"
    settings.TRAILER_YOUTUBE_ID = "envtrailer1"
    IndexConfig.objects.create(
        name="Imperium",
        seo_title="Imperium SEO",
        seo_description="Reino público",
        discord_url="https://discord.gg/imperium",
        trailer_youtube_id="abcdefghijk",
        is_active=True,
    )
    response = APIClient().get("/api/v1/public/server/info/")
    assert response.status_code == 200
    assert response.data["seo_title"] == "Imperium SEO"
    assert response.data["seo_description"] == "Reino público"
    assert response.data["og_title"] == "Imperium SEO"
    assert response.data["discord_url"] == "https://discord.gg/imperium"
    assert response.data["trailer_youtube_id"] == "abcdefghijk"
    assert response.data["site_name_customized"] is True


@pytest.mark.django_db
def test_public_server_info_falls_back_to_env_seo(settings):
    settings.SITE_SEO_TITLE = "Env SEO"
    settings.SITE_SEO_DESCRIPTION = "Env desc"
    settings.DISCORD_URL = "https://discord.gg/env"
    response = APIClient().get("/api/v1/public/server/info/")
    assert response.status_code == 200
    assert response.data["seo_title"] == "Env SEO"
    assert response.data["seo_description"] == "Env desc"
    assert response.data["discord_url"] == "https://discord.gg/env"
    assert response.data["site_name_customized"] is False
