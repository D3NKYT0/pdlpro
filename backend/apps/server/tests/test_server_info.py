from rest_framework.test import APIClient
import pytest

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


@pytest.mark.django_db
def test_public_server_info_exposes_coming_soon_flag():
    IndexConfig.objects.create(name="Imperium", coming_soon=True, is_active=True)
    response = APIClient().get("/api/v1/public/server/info/")
    assert response.status_code == 200
    assert response.data["coming_soon"] is True
    assert response.data["name"] == "Imperium"
