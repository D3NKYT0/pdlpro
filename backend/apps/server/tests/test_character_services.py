import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.wallet.domain.repositories import IWalletRepository
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


def _seed_character(player):
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    return gateway.seed_character("hero", "SirHero")


@pytest.mark.django_db
def test_list_and_get_character_includes_sheet_fields(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    char = _seed_character(player)

    listed = api.get("/api/v1/customer/server/characters/?login=hero")
    assert listed.status_code == 200
    assert listed.data[0]["name"] == "SirHero"
    assert listed.data[0]["class_id"] == 0
    assert listed.data[0]["title"] == ""
    assert listed.data[0]["is_clan_leader"] is False

    detail = api.get(f"/api/v1/customer/server/characters/{char.char_id}/?login=hero")
    assert detail.status_code == 200
    assert detail.data["char_id"] == char.char_id
    assert detail.data["name"] == "SirHero"


@pytest.mark.django_db
def test_character_services_nickname_sex_unstuck(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    char = _seed_character(player)
    wallets = DependencyInjection.root().resolve(IWalletRepository)
    wallet = wallets.get_or_create(player.id)
    wallets.credit(wallet.id, Decimal("100.00"), origin="test", description="saldo de teste")

    nick = api.post(
        "/api/v1/customer/server/characters/nickname/",
        {"login": "hero", "char_id": char.char_id, "name": "NovoHero"},
        format="json",
    )
    assert nick.status_code == 200, nick.data

    sex = api.post(
        "/api/v1/customer/server/characters/sex/",
        {"login": "hero", "char_id": char.char_id, "sex": "F"},
        format="json",
    )
    assert sex.status_code == 200, sex.data

    unstuck = api.post(
        "/api/v1/customer/server/characters/unstuck/",
        {"login": "hero", "char_id": char.char_id},
        format="json",
    )
    assert unstuck.status_code == 200, unstuck.data

    detail = api.get(f"/api/v1/customer/server/characters/{char.char_id}/?login=hero")
    assert detail.data["name"] == "NovoHero"
    assert detail.data["sex"] == 1


@pytest.mark.django_db
def test_service_prices_are_exposed(api, player):
    api.force_authenticate(user=player)
    response = api.get("/api/v1/customer/server/services/")
    assert response.status_code == 200
    assert "CHANGE_NICKNAME" in response.data
    assert response.data["UNSTUCK"] == "0.00"
