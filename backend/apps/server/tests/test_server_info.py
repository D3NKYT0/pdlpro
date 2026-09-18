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
    assert response.data["coming_soon_at"] is None


@pytest.mark.django_db
def test_public_server_info_exposes_coming_soon_launch_fields():
    IndexConfig.objects.create(
        name="Imperium",
        coming_soon=True,
        coming_soon_title="O portal se abre",
        coming_soon_subtitle="Prepare-se",
        coming_soon_at=datetime(2027, 1, 3, 18, 0, tzinfo=UTC),
        is_active=True,
    )
    response = APIClient().get("/api/v1/public/server/info/")
    assert response.status_code == 200
    assert response.data["coming_soon"] is True
    assert response.data["coming_soon_title"] == "O portal se abre"
    assert response.data["coming_soon_subtitle"] == "Prepare-se"
    assert response.data["coming_soon_at"].startswith("2027-01-03T18:00:00")
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
