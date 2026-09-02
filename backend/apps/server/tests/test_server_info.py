from rest_framework.test import APIClient
import pytest


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
