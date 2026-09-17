from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.games.infrastructure.models import (
    BattlePassExchange,
    BattlePassLevel,
    BattlePassMilestone,
    BattlePassQuest,
    BattlePassReward,
    BattlePassSeason,
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
        "battle_pass",
    ]
    assert BoxType.objects.filter(active=True).count() >= 1
    assert CatalogItem.objects.filter(item_id=6577, active=True).exists()
    assert CatalogItem.objects.filter(item_id=6658, active=True).exists()
    common = BoxType.objects.get(name="Baú Comum")
    legendary = BoxType.objects.get(name="Baú Lendário")
    assert common.boosters_amount == 20
    assert BoxType.objects.get(name="Baú Raro").boosters_amount == 30
    assert BoxType.objects.get(name="Baú Épico").boosters_amount == 40
    assert legendary.boosters_amount == 50
    assert common.items.filter(item_id=6569).exists()
    assert not common.items.filter(item_id=6658).exists()
    assert BoxType.objects.get(name="Baú Raro").items.filter(item_id=6578).exists()
    assert BoxType.objects.get(name="Baú Épico").items.filter(item_id=6577).exists()
    assert legendary.items.filter(item_id=6658).exists()
    assert not legendary.items.filter(item_id=6569).exists()
    assert CatalogItem.objects.filter(item_id=736, quantity=20, active=True).exists()
    assert CatalogItem.objects.filter(item_id=3470, active=True).exists()
    assert CatalogItem.objects.filter(item_id=57, quantity=80_000, active=True).exists()
    luck = DailyBonusPoolEntry.objects.get(name="Moeda da Sorte")
    assert luck.rewards[0]["item_id"] == 4037
    assert luck.rewards[0]["quantity"] == 3
    assert FishingBait.objects.filter(active=True).count() >= 1
    token_bait = FishingBait.objects.get(name="Isca comum")
    assert token_bait.paid_with == "tokens"
    assert token_bait.name_en == "Common bait"
    assert token_bait.name_es == "Cebo común"
    apprentice = FishingBait.objects.get(name="Isca do aprendiz")
    assert apprentice.paid_with == "baits"
    assert apprentice.price == 3
    enchanted = FishingBait.objects.get(name="Isca encantada")
    assert enchanted.paid_with == "baits"
    assert enchanted.price == 8
    ancestral = Fish.objects.get(name="Pirarucu Ancestral")
    assert ancestral.item_id == 955
    assert ancestral.quantity == 1
    lambari = Fish.objects.get(name="Lambari")
    assert lambari.item_id == 1835
    assert lambari.quantity == 800
    tilapia = Fish.objects.get(name="Tilápia")
    assert tilapia.rarity == "common"
    serafim = Fish.objects.get(name="Serafim de Eva")
    assert serafim.rarity == "divine"
    assert serafim.name_en == "Seraph of Eva"
    assert serafim.name_es == "Serafín de Eva"
    assert serafim.item_id == 6577
    assert serafim.min_rod_level == 5
    assert Monster.objects.filter(name="Drake").exists()
    assert Monster.objects.filter(name="Wolf").exists()
    assert Monster.objects.filter(name="Death Knight").exists()
    assert Monster.objects.filter(
        name__in=[
            "Elder Keltir",
            "Wolf",
            "Goblin",
            "Orc",
            "Lizardman",
            "Ant Recruit",
            "Werewolf",
            "Ogre",
            "Drake",
            "Death Knight",
        ]
    ).count() == 10
    drake = Monster.objects.get(name="Drake")
    assert drake.required_weapon_level == 5
    assert Monster.objects.get(name="Death Knight").level == 10
    queen = Monster.objects.get(name="Queen Ant")
    assert queen.is_boss is True
    assert queen.required_weapon_level == 10
    assert queen.fragment_reward == 0
    assert Monster.objects.get(name="Death Knight").is_boss is False
    listed = api.get("/api/v1/staff/games/")
    assert listed.status_code == 200
    assert {item["code"] for item in listed.data} >= {"roulette", "fishing", "economy"}
    common.boosters_amount = 5
    common.save(update_fields=["boosters_amount"])
    repeat = api.post(AUTOCONFIG, {}, format="json")
    assert repeat.status_code == 200
    boxes = next(item for item in repeat.data["games"] if item["code"] == "boxes")
    assert boxes["created"]["box_types"] == 0
    assert boxes["created"]["catalog_items"] == 0
    assert BoxType.objects.get(name="Baú Comum").boosters_amount == 20
    assert BattlePassLevel.objects.filter(season__name="Temporada Low Rate").count() == 30
    battle_pass = next(item for item in repeat.data["games"] if item["code"] == "battle_pass")
    assert battle_pass["created"]["levels"] == 0
    assert battle_pass["created"]["quests"] == 0


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


@pytest.mark.django_db
def test_battle_pass_autoconfig_fills_30_levels_quests_and_is_idempotent(api, staff, player):
    from apps.games.domain.battle_pass_catalog import (
        BATTLE_PASS_EXCHANGES,
        BATTLE_PASS_FREE,
        BATTLE_PASS_LEVELS,
        BATTLE_PASS_MILESTONES,
        BATTLE_PASS_PREMIUM,
        BATTLE_PASS_PREMIUM_EXTRA,
        BATTLE_PASS_QUESTS,
        BATTLE_PASS_SEASON_NAME,
        BATTLE_PASS_XP_STEP,
    )

    api.force_authenticate(user=staff)
    first = api.post(AUTOCONFIG, {"code": "battle_pass"}, format="json")
    assert first.status_code == 200, first.data
    entry = first.data["games"][0]
    assert entry["code"] == "battle_pass"
    assert entry["activated"] is True
    assert len(BATTLE_PASS_FREE) == BATTLE_PASS_LEVELS
    assert len(BATTLE_PASS_PREMIUM) == BATTLE_PASS_LEVELS
    assert entry["created"]["levels"] == BATTLE_PASS_LEVELS - 3
    assert entry["created"]["quests"] == len(BATTLE_PASS_QUESTS)
    assert entry["created"]["exchanges"] == len(BATTLE_PASS_EXCHANGES)
    assert entry["created"]["milestones"] == len(BATTLE_PASS_MILESTONES)

    season = BattlePassSeason.objects.get(name=BATTLE_PASS_SEASON_NAME)
    assert season.active is True
    assert BattlePassLevel.objects.filter(season=season).count() == BATTLE_PASS_LEVELS
    level_30 = BattlePassLevel.objects.get(season=season, level=30)
    assert level_30.required_xp == BATTLE_PASS_XP_STEP * 29
    free_ids = set(
        BattlePassReward.objects.filter(level_row__season=season, is_premium=False).values_list(
            "item_id", flat=True
        )
    )
    premium_ids = set(
        BattlePassReward.objects.filter(level_row__season=season, is_premium=True).values_list(
            "item_id", flat=True
        )
    )
    assert 57 in free_ids
    assert 1835 in free_ids
    assert 3470 in free_ids
    assert 951 in premium_ids
    assert 3470 in premium_ids
    extra_total = sum(len(items) for items in BATTLE_PASS_PREMIUM_EXTRA.values())
    assert BattlePassReward.objects.filter(level_row__season=season, is_premium=False).count() == len(
        BATTLE_PASS_FREE
    )
    assert BattlePassReward.objects.filter(level_row__season=season, is_premium=True).count() == (
        len(BATTLE_PASS_PREMIUM) + extra_total
    )
    soulshot = BattlePassReward.objects.get(
        level_row__season=season, level_row__level=2, is_premium=False, item_id=1835
    )
    assert soulshot.item_name == "Soulshot: No Grade"
    assert soulshot.quantity == 800
    assert BattlePassReward.objects.filter(
        level_row__season=season, level_row__level=30, is_premium=True, item_id=57, quantity=3_000_000
    ).exists()
    assert BattlePassQuest.objects.filter(season=season, period="daily").count() == 4
    assert BattlePassQuest.objects.filter(season=season, event="fishing").count() == 3
    assert BattlePassExchange.objects.filter(season=season, required_item_id=1835).exists()
    champ = BattlePassMilestone.objects.get(season=season, name="Marco do campeão")
    assert champ.required_xp == level_30.required_xp

    api.force_authenticate(user=player)
    payload = api.get("/api/v1/customer/games/battle-pass/")
    assert payload.status_code == 200, payload.data
    assert payload.data["season"]["name"] == BATTLE_PASS_SEASON_NAME
    assert len(payload.data["levels"]) == BATTLE_PASS_LEVELS
    first_level = payload.data["levels"][0]
    assert any(not row["is_premium"] for row in first_level["rewards"])
    assert any(row["is_premium"] for row in first_level["rewards"])
    details = api.get("/api/v1/customer/games/battle-pass/details/")
    assert details.status_code == 200, details.data
    assert len(details.data["quests"]) == len(BATTLE_PASS_QUESTS)
    assert len(details.data["exchanges"]) == len(BATTLE_PASS_EXCHANGES)
    assert len(details.data["milestones"]) == len(BATTLE_PASS_MILESTONES)

    api.force_authenticate(user=staff)
    second = api.post(AUTOCONFIG, {"code": "battle_pass"}, format="json")
    assert second.status_code == 200, second.data
    created = second.data["games"][0]["created"]
    assert created["levels"] == 0
    assert created["rewards"] == 0
    assert created["quests"] == 0
    assert created["exchanges"] == 0
    assert created["milestones"] == 0
    assert BattlePassLevel.objects.filter(season=season).count() == BATTLE_PASS_LEVELS


@pytest.mark.django_db
def test_battle_pass_autoconfig_expands_legacy_season_without_keeping_seed_rewards(api, staff, player):
    from datetime import timedelta

    from django.utils import timezone

    from apps.games.domain.battle_pass_catalog import BATTLE_PASS_SEASON_NAME

    season = BattlePassSeason.objects.get(name="Temporada 1")
    assert BattlePassLevel.objects.filter(season=season).count() == 3
    season.ends_at = timezone.now() - timedelta(days=1)
    season.save(update_fields=["ends_at"])
    api.force_authenticate(user=staff)
    response = api.post(AUTOCONFIG, {"code": "battle_pass"}, format="json")
    assert response.status_code == 200, response.data
    season.refresh_from_db()
    assert season.name == BATTLE_PASS_SEASON_NAME
    assert season.ends_at > timezone.now()
    assert BattlePassLevel.objects.filter(season=season, level=2).get().required_xp == 120
    assert not BattlePassReward.objects.filter(description="Livre Nv.1").exists()
    free_one = BattlePassReward.objects.get(
        level_row__season=season, level_row__level=1, is_premium=False
    )
    assert free_one.item_id == 57
    assert free_one.quantity == 80_000
    api.force_authenticate(user=player)
    payload = api.get("/api/v1/customer/games/battle-pass/")
    assert payload.status_code == 200, payload.data
    assert payload.data["season"]["name"] == BATTLE_PASS_SEASON_NAME
    assert len(payload.data["levels"]) == 30

