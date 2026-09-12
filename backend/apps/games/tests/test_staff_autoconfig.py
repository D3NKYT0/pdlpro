from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.games.infrastructure.models import (
    BoxType,
    CatalogItem,
    DailyBonusPoolEntry,
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
    prize_count = Prize.objects.filter(active=True).count()
    ids = set(Prize.objects.filter(active=True).values_list("item_id", flat=True))
    assert 1835 in ids
    assert 57 in ids
    assert 3470 in ids
    assert 4037 in ids
    assert 6577 in ids
    assert 6657 not in ids
    soulshot = Prize.objects.get(item_id=1835, active=True)
    assert soulshot.name == "Soulshot: No Grade"
    assert soulshot.quantity == 2000
    assert Prize.objects.get(item_id=3470, active=True).name == "Gold Bar"
    assert Prize.objects.filter(item_id=57, active=True, quantity=50_000).exists()
    assert Prize.objects.filter(item_id=57, active=True, quantity=5_000_000).exists()
    second = api.post(AUTOCONFIG, {"code": "roulette"}, format="json")
    assert second.status_code == 200
    assert second.data["games"][0]["created"]["prizes"] == 0
    assert Prize.objects.filter(active=True).count() == prize_count


@pytest.mark.django_db
def test_autoconfig_renames_legacy_seed_titles(api, staff):
    GameConfig.objects.update_or_create(
        code="dice",
        defaults={"name": "Dados", "active": True, "settings": {"min_bet": 1}},
    )
    GameConfig.objects.filter(code="roulette").update(name="Roleta")
    GameConfig.objects.filter(code="dice").update(name="Dados")
    api.force_authenticate(user=staff)
    response = api.post(AUTOCONFIG, {}, format="json")
    assert response.status_code == 200, response.data
    assert GameConfig.objects.get(code="roulette").name == "Roda da Fortuna"
    assert GameConfig.objects.get(code="dice").name == "Mesa da Taverna"
    custom = GameConfig.objects.get(code="roulette")
    custom.name = "Minha Roleta"
    custom.save(update_fields=["name"])
    repeat = api.post(AUTOCONFIG, {"code": "roulette"}, format="json")
    assert repeat.status_code == 200
    assert GameConfig.objects.get(code="roulette").name == "Minha Roleta"


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
    assert CatalogItem.objects.filter(item_id=6577, active=True).exists()
    assert CatalogItem.objects.filter(item_id=57, quantity=80_000, active=True).exists()
    luck = DailyBonusPoolEntry.objects.get(name="Moeda da Sorte")
    assert luck.rewards[0]["item_id"] == 4037
    assert luck.rewards[0]["quantity"] == 3
    assert FishingBait.objects.filter(active=True).count() >= 1
    ancestral = Fish.objects.get(name="Pirarucu Ancestral")
    assert ancestral.item_id == 955
    assert ancestral.quantity == 1
    lambari = Fish.objects.get(name="Lambari")
    assert lambari.item_id == 1835
    assert lambari.quantity == 800
    assert Monster.objects.filter(name="Drake").exists()
    listed = api.get("/api/v1/staff/games/")
    assert listed.status_code == 200
    assert {item["code"] for item in listed.data} >= {"roulette", "fishing", "economy"}
    repeat = api.post(AUTOCONFIG, {}, format="json")
    assert repeat.status_code == 200
    boxes = next(item for item in repeat.data["games"] if item["code"] == "boxes")
    assert boxes["created"]["box_types"] == 0
    assert boxes["created"]["catalog_items"] == 0


@pytest.mark.django_db
def test_staff_can_configure_roulette_prize(api, staff):
    api.force_authenticate(user=staff)
    created = api.post(
        "/api/v1/staff/game-content/prizes/",
        {
            "name": "Soulshot: No Grade",
            "item_id": 1835,
            "enchant": 0,
            "quantity": 2000,
            "weight": 12,
            "rarity": "comum",
            "active": True,
        },
        format="json",
    )
    assert created.status_code == 201, created.data
    assert created.data["item_id"] == 1835
    assert created.data["quantity"] == 2000
    listed = api.get("/api/v1/staff/game-content/prizes/")
    assert listed.status_code == 200
    assert any(row["item_id"] == 1835 and row["quantity"] == 2000 for row in listed.data)


@pytest.mark.django_db
def test_autoconfig_replaces_unit_prizes_with_low_rate_stacks(api, staff):
    leftover = Prize.objects.create(
        name="Soulshot: No Grade", item_id=1835, enchant=0, quantity=1, weight=36, rarity="comum"
    )
    Prize.objects.create(name="Necklace of Valakas", item_id=6657, enchant=0, quantity=1, weight=1, rarity="lendario")
    api.force_authenticate(user=staff)
    response = api.post(AUTOCONFIG, {"code": "roulette"}, format="json")
    assert response.status_code == 200, response.data
    leftover.refresh_from_db()
    assert leftover.active is False
    assert Prize.objects.filter(item_id=6657, active=True).count() == 0
    stacked = Prize.objects.get(item_id=1835, quantity=2000, active=True)
    assert stacked.weight == 16
    assert Prize.objects.filter(item_id=57, quantity=50_000, active=True).exists()
