from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.games.infrastructure.models import (
    BoxType,
    CatalogItem,
    Fish,
    FishingBait,
    GameConfig,
    Monster,
    Prize,
)

User = get_user_model()
AUTOCONFIG = "/api/v1/staff/games/autoconfig/"


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.fixture
def staff(db):
    return User.objects.create_user(
        username="gm",
        email="gm@pdl.dev",
        password="Secret123",
        is_staff=True,
        role=User.Role.STAFF,
    )


@pytest.mark.django_db
def test_player_cannot_autoconfig_games(api, player):
    api.force_authenticate(user=player)
    response = api.post(AUTOCONFIG, {}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_unknown_game_code_is_rejected(api, staff):
    api.force_authenticate(user=staff)
    response = api.post(AUTOCONFIG, {"code": "nope"}, format="json")
    assert response.status_code == 400
    assert "desconhecido" in response.data["message"].lower()


@pytest.mark.django_db
def test_roulette_autoconfig_creates_prizes_and_is_idempotent(api, staff):
    Prize.objects.all().delete()
    GameConfig.objects.filter(code="roulette").update(
        name="Minha Roleta",
        active=False,
        settings={"cost": 9},
    )
    api.force_authenticate(user=staff)
    first = api.post(AUTOCONFIG, {"code": "roulette"}, format="json")
    assert first.status_code == 200, first.data
    entry = first.data["games"][0]
    assert entry["code"] == "roulette"
    assert entry["activated"] is True
    assert entry["created"]["prizes"] >= 1
    row = GameConfig.objects.get(code="roulette")
    assert row.name == "Minha Roleta"
    assert row.active is True
    assert row.settings["cost"] == 9
    assert row.settings["fail_chance"] == 20
    prize_count = Prize.objects.count()
    second = api.post(AUTOCONFIG, {"code": "roulette"}, format="json")
    assert second.status_code == 200
    assert second.data["games"][0]["created"]["prizes"] == 0
    assert Prize.objects.count() == prize_count


@pytest.mark.django_db
def test_roulette_is_playable_after_autoconfig(api, staff, player):
    Prize.objects.all().delete()
    GameConfig.objects.filter(code="roulette").update(
        active=True,
        settings={"cost": 1, "fail_chance": 0},
    )
    api.force_authenticate(user=staff)
    filled = api.post(AUTOCONFIG, {"code": "roulette"}, format="json")
    assert filled.status_code == 200, filled.data
    player.fichas = 3
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    spin = api.post("/api/v1/customer/games/roulette/")
    assert spin.status_code == 200, spin.data
    assert spin.data["failed"] is False
    assert spin.data["prize"]["name"]


@pytest.mark.django_db
def test_autoconfig_all_fills_boxes_baits_and_monsters(api, staff):
    BoxType.objects.all().delete()
    CatalogItem.objects.all().delete()
    FishingBait.objects.all().delete()
    Fish.objects.filter(name="Pirarucu Ancestral").delete()
    Monster.objects.filter(name="Dragão Negro").delete()
    api.force_authenticate(user=staff)
    response = api.post(AUTOCONFIG, {}, format="json")
    assert response.status_code == 200, response.data
    codes = [item["code"] for item in response.data["games"]]
    assert codes == [
        "roulette",
        "daily_bonus",
        "dice",
        "slots",
        "fishing",
        "economy",
        "boxes",
    ]
    assert BoxType.objects.filter(active=True).count() >= 1
    assert CatalogItem.objects.filter(active=True).count() >= 1
    assert FishingBait.objects.filter(active=True).count() >= 1
    assert Fish.objects.filter(name="Pirarucu Ancestral").exists()
    assert Monster.objects.filter(name="Dragão Negro").exists()
    listed = api.get("/api/v1/staff/games/")
    assert listed.status_code == 200
    assert {item["code"] for item in listed.data} >= {"roulette", "fishing", "economy"}
    repeat = api.post(AUTOCONFIG, {}, format="json")
    assert repeat.status_code == 200
    boxes = next(item for item in repeat.data["games"] if item["code"] == "boxes")
    assert boxes["created"]["box_types"] == 0
    assert boxes["created"]["catalog_items"] == 0
