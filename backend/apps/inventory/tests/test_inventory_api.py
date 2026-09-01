import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import GameItem, ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_register_and_list_accounts(api, player):
    api.force_authenticate(user=player)
    before = api.get("/api/v1/customer/server/accounts/")
    assert before.status_code == 200
    assert before.data["accounts"] == []

    response = api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    assert response.status_code == 200
    assert response.data["login"] == "hero"
    listed = api.get("/api/v1/customer/server/accounts/")
    assert listed.status_code == 200
    assert listed.data["slots"]["can_link"] is True
    logins = [row["login"] for row in listed.data["accounts"]]
    assert "hero" in logins


@pytest.mark.django_db
def test_withdraw_and_deposit_roundtrip(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    from common.di.bootstrap import DependencyInjection

    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character("hero", "SirHero", items=[GameItem(57, "Adena", 1000, 0)])
    withdrawn = api.post(
        "/api/v1/customer/inventory/withdraw/",
        {"char_id": char.char_id, "item_id": 57, "quantity": 100},
        format="json",
    )
    assert withdrawn.status_code == 200, withdrawn.data
    dashboard = api.get("/api/v1/customer/inventory/")
    assert dashboard.status_code == 200
    assert dashboard.data[0]["items"][0]["quantity"] == 100
    inventory_id = dashboard.data[0]["inventory_id"]
    deposited = api.post(
        "/api/v1/customer/inventory/deposit/",
        {"inventory_id": inventory_id, "item_id": 57, "quantity": 40, "enchant": 0},
        format="json",
    )
    assert deposited.status_code == 200
    leftover = api.get("/api/v1/customer/inventory/")
    assert leftover.data[0]["items"][0]["quantity"] == 60
