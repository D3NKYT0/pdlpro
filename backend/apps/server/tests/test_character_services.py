from decimal import Decimal

import pytest
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
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    char = _seed_character(player)

    listed = api.get("/api/v1/customer/server/characters/?login=hero")
    assert listed.status_code == 200
    assert listed.data[0]["name"] == "SirHero"
    assert listed.data[0]["class_id"] == 0
    assert listed.data[0]["title"] == ""
    assert listed.data[0]["is_clan_leader"] is False
    assert listed.data[0]["adena"] == 0
    assert listed.data[0]["ally_name"] == ""
    assert listed.data[0]["clan_crest_base64"] == ""
    assert listed.data[0]["ally_crest_base64"] == ""

    detail = api.get(f"/api/v1/customer/server/characters/{char.char_id}/?login=hero")
    assert detail.status_code == 200
    assert detail.data["char_id"] == char.char_id
    assert detail.data["name"] == "SirHero"
    assert detail.data["karma"] == 0
    assert detail.data["online_time"] == 0
    assert detail.data["last_access"] == 0
    assert detail.data["clan_id"] == 0
    assert detail.data["ally_id"] == 0


@pytest.mark.django_db
def test_character_services_nickname_sex_unstuck(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
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
    assert "TELEPORT" in response.data["available"]
    assert any(town["id"] == "giran" for town in response.data["catalog"]["towns"])


@pytest.mark.django_db
def test_tavern_teleport_appearance_and_karma(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character("hero", "SirHero", karma=80, pk=4, hair_style=0, hair_color=0, face=0)
    wallets = DependencyInjection.root().resolve(IWalletRepository)
    wallet = wallets.get_or_create(player.id)
    wallets.credit(wallet.id, Decimal("100.00"), origin="test", description="saldo de teste")

    teleport = api.post(
        "/api/v1/customer/server/characters/teleport/",
        {"login": "hero", "char_id": char.char_id, "town": "aden"},
        format="json",
    )
    assert teleport.status_code == 200, teleport.data

    look = api.post(
        "/api/v1/customer/server/characters/appearance/",
        {"login": "hero", "char_id": char.char_id, "hair_style": 2, "hair_color": 1, "face": 1},
        format="json",
    )
    assert look.status_code == 200, look.data

    karma = api.post(
        "/api/v1/customer/server/characters/karma/",
        {"login": "hero", "char_id": char.char_id},
        format="json",
    )
    assert karma.status_code == 200, karma.data

    pk = api.post(
        "/api/v1/customer/server/characters/pk/",
        {"login": "hero", "char_id": char.char_id},
        format="json",
    )
    assert pk.status_code == 200, pk.data

    detail = api.get(f"/api/v1/customer/server/characters/{char.char_id}/?login=hero")
    assert detail.data["hair_style"] == 2
    assert detail.data["hair_color"] == 1
    assert detail.data["face"] == 1
    assert detail.data["karma"] == 0
    assert detail.data["pk"] == 0


@pytest.mark.django_db
def test_tavern_rejects_online_character(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    char = gateway.seed_character("hero", "OnlineHero", online=True, karma=10)
    wallets = DependencyInjection.root().resolve(IWalletRepository)
    wallet = wallets.get_or_create(player.id)
    wallets.credit(wallet.id, Decimal("50.00"), origin="test", description="saldo de teste")

    response = api.post(
        "/api/v1/customer/server/characters/karma/",
        {"login": "hero", "char_id": char.char_id},
        format="json",
    )
    assert response.status_code == 400
    assert response.data["error_code"] == "CHARACTER_MUST_BE_OFFLINE"
