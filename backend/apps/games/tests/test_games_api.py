from datetime import date
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.communication.infrastructure.models import Notification
from apps.games.infrastructure.models import DailyBonusClaim, GameConfig, Prize
from apps.wallet.infrastructure.models import Wallet

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="gamer1", email="gamer1@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_public_world_query_returns_empty_without_lineage(api):
    response = api.get("/api/v1/public/server/world/olympiad_ranking/")
    assert response.status_code == 200
    assert response.data == []


@pytest.mark.django_db
def test_public_world_query_rejects_unknown_name(api):
    response = api.get("/api/v1/public/server/world/drop_all/")
    assert response.status_code == 400


@pytest.mark.django_db
def test_notifications_list_and_mark_read(api, player):
    other = User.objects.create_user(username="other1", email="other1@pdl.dev", password="Secret123")
    mine = Notification.objects.create(user=player, title="Bem-vindo", body="Painel 2.0", kind="info")
    Notification.objects.create(user=other, title="Alheia", body="Não deve aparecer")
    api.force_authenticate(user=player)
    listed = api.get("/api/v1/customer/notifications/")
    assert listed.status_code == 200
    assert listed.data["unread"] == 1
    assert listed.data["results"][0]["title"] == "Bem-vindo"
    marked = api.post(f"/api/v1/customer/notifications/{mine.id}/read/")
    assert marked.status_code == 200
    assert marked.data["is_read"] is True
    listed = api.get("/api/v1/customer/notifications/")
    assert listed.data["unread"] == 0


@pytest.mark.django_db
def test_daily_bonus_credits_wallet_once(api, player):
    GameConfig.objects.update_or_create(
        code="daily_bonus",
        defaults={"name": "Bônus diário", "active": True, "settings": {"amount": "10.00"}},
    )
    api.force_authenticate(user=player)
    first = api.post("/api/v1/customer/games/daily-bonus/")
    assert first.status_code == 200, first.data
    assert first.data["amount"] == "10.00"
    wallet = api.get("/api/v1/shared/wallet/")
    assert wallet.data["balance"] == "10.00"
    second = api.post("/api/v1/customer/games/daily-bonus/")
    assert second.status_code == 409
    state = api.get("/api/v1/customer/games/daily-bonus/")
    assert state.data["claimed"] is True
    assert DailyBonusClaim.objects.filter(user=player, claimed_on=date.today()).count() == 1


@pytest.mark.django_db
def test_buy_tokens_and_spin_roulette(api, player):
    GameConfig.objects.update_or_create(
        code="roulette",
        defaults={"name": "Roleta", "active": True, "settings": {"cost": 1, "fail_chance": 0}},
    )
    Prize.objects.create(name="Adena", item_id=57, weight=10, rarity="comum")
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/tokens/", {"amount": 5}, format="json")
    assert bought.status_code == 200, bought.data
    assert bought.data["fichas"] == 5
    spin = api.post("/api/v1/customer/games/roulette/")
    assert spin.status_code == 200, spin.data
    assert spin.data["failed"] is False
    assert spin.data["prize"]["name"] == "Adena"
    bag = api.get("/api/v1/customer/games/bag/")
    assert bag.status_code == 200
    assert bag.data[0]["item_name"] == "Adena"
    assert bag.data[0]["quantity"] == 1


@pytest.mark.django_db
def test_buy_and_open_box(api, player):
    from apps.games.infrastructure.models import BoxType, CatalogItem

    CatalogItem.objects.create(name="Scroll", item_id=736, rarity="common", weight=10)
    box_type = BoxType.objects.create(name="Bronze", price=Decimal("5.00"), boosters_amount=2)
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    player.fichas = 3
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert bought.status_code == 200, bought.data
    assert bought.data["remaining"] == 2
    opened = api.post(f"/api/v1/customer/games/boxes/{bought.data['id']}/open/")
    assert opened.status_code == 200, opened.data
    from apps.server.infrastructure.lineage.item_catalog import item_metadata
    assert opened.data["item"]["name"] == item_metadata(opened.data["item"]["item_id"])["name"]
    assert opened.data["remaining"] == 1


@pytest.mark.django_db
def test_dice_and_slots(api, player):
    GameConfig.objects.update_or_create(code="dice", defaults={"name": "Dados", "active": True, "settings": {"min_bet": 1}})
    GameConfig.objects.update_or_create(code="slots", defaults={"name": "Slots", "active": True, "settings": {"cost": 1}})
    player.fichas = 20
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    dice = api.post("/api/v1/customer/games/dice/", {"bet_type": "even", "amount": 1}, format="json")
    assert dice.status_code == 200, dice.data
    assert dice.data["roll"] in range(1, 7)
    slots = api.post("/api/v1/customer/games/slots/")
    assert slots.status_code == 200, slots.data
    assert len(slots.data["reels"]) == 3


@pytest.mark.django_db
def test_fishing_cast(api, player):
    from unittest.mock import patch

    from apps.games.infrastructure.models import Fish

    GameConfig.objects.update_or_create(
        code="fishing", defaults={"name": "Pesca", "active": True, "settings": {"cost_per_cast": 1}}
    )
    fish = Fish.objects.create(name="Lambari Teste", rarity="common", min_rod_level=1, weight=10, xp_reward=10)
    player.fichas = 5
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    with (
        patch("apps.games.application.fishing_use_cases.random.randint", return_value=1),
        patch("apps.games.application.fishing_use_cases.random.choices", return_value=[fish]),
    ):
        cast = api.post("/api/v1/customer/games/fishing/")
    assert cast.status_code == 200, cast.data
    assert cast.data["success"] is True
    assert cast.data["fish"]["name"] == "Lambari Teste"
    state = api.get("/api/v1/customer/games/fishing/")
    assert state.status_code == 200
    assert state.data["rod"]["xp"] >= 10


@pytest.mark.django_db
def test_economy_fight_and_enchant(api, player):
    from unittest.mock import patch

    from apps.games.infrastructure.models import EconomyWeapon, Monster

    GameConfig.objects.update_or_create(code="economy", defaults={"name": "Economia", "active": True, "settings": {}})
    monster = Monster.objects.create(
        name="Goblin Teste",
        level=1,
        required_weapon_level=0,
        fragment_reward=12,
        hp=10,
        attack=1,
        defense=0,
        respawn_seconds=5,
    )
    player.fichas = 3
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    fight = api.post(f"/api/v1/customer/games/economy/{monster.id}/fight/")
    assert fight.status_code == 200, fight.data
    assert fight.data["won"] is True
    assert fight.data["fragments_earned"] == 12
    with patch("apps.games.application.economy_use_cases.random.randint", return_value=1):
        enchant = api.post("/api/v1/customer/games/economy/enchant/")
    assert enchant.status_code == 200, enchant.data
    assert enchant.data["success"] is True
    weapon = EconomyWeapon.objects.get(user=player)
    assert weapon.level == 1
    assert weapon.fragments == 2


@pytest.mark.django_db
def test_battle_pass_claim_free_reward(api, player):
    from datetime import timedelta

    from django.utils import timezone

    from apps.games.infrastructure.models import BattlePassLevel, BattlePassReward, BattlePassSeason

    BattlePassSeason.objects.update(active=False)
    season = BattlePassSeason.objects.create(
        name="Teste BP",
        starts_at=timezone.now() - timedelta(days=1),
        ends_at=timezone.now() + timedelta(days=10),
        active=True,
        premium_price=Decimal("10.00"),
    )
    level = BattlePassLevel.objects.create(season=season, level=1, required_xp=0)
    reward = BattlePassReward.objects.create(
        level_row=level, is_premium=False, item_id=57, item_name="Adena", quantity=50
    )
    api.force_authenticate(user=player)
    state = api.get("/api/v1/customer/games/battle-pass/")
    assert state.status_code == 200, state.data
    assert state.data["current_level"] == 1
    claimed = api.post(f"/api/v1/customer/games/battle-pass/{reward.id}/claim/")
    assert claimed.status_code == 200, claimed.data
    bag = api.get("/api/v1/customer/games/bag/")
    assert any(item["item_name"] == "Adena" and item["quantity"] >= 50 for item in bag.data)
