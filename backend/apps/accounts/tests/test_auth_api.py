from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_health(api):
    response = api.get("/api/v1/system/health/")
    assert response.status_code == 200
    assert response.data["status"] == "ok"


@pytest.mark.django_db
def test_register_and_me(api):
    response = api.post(
        "/api/v1/auth/register/",
        {"username": "knight", "email": "knight@pdl.dev", "password": "Secret123"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["username"] == "knight"
    me = api.get("/api/v1/shared/me/")
    assert me.status_code == 200
    assert me.data["username"] == "knight"


@pytest.mark.django_db
def test_login(api, user):
    response = api.post(
        "/api/v1/auth/login/",
        {"login": "hero", "password": "Secret123"},
        format="json",
    )
    assert response.status_code == 200
    assert response.data["username"] == "hero"


@pytest.mark.django_db
def test_wallet_is_created_on_first_access(api, user):
    api.force_authenticate(user=user)
    response = api.get("/api/v1/shared/wallet/")
    assert response.status_code == 200
    assert Decimal(response.data["balance"]) == Decimal("0.00")


@pytest.mark.django_db
def test_public_rankings_empty_without_lineage_db(api):
    response = api.get("/api/v1/public/server/rankings/pvp/")
    assert response.status_code == 200
    assert response.data == []
