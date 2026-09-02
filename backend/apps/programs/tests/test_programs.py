from datetime import timedelta
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.games.infrastructure.models import (
    Bag,
    BagItem,
    BattlePassExchange,
    BattlePassLevel,
    BattlePassMilestone,
    BattlePassQuest,
    BattlePassQuestClaim,
    BattlePassReward,
    BattlePassSeason,
    DailyBonusDay,
    DailyBonusPoolEntry,
    DailyBonusSeason,
    FishingBait,
    GameConfig,
    SpinHistory,
    UserBattlePassClaim,
    UserBattlePassProgress,
    UserFishingBait,
)
from apps.programs.models import Commission, RoadmapEntry, Supporter, SystemResource
from apps.shop.infrastructure.models import (
    PromotionCode,
    ShopItem,
    ShopPackage,
    ShopPackageItem,
    ShopPurchase,
)
from apps.wallet.infrastructure.models import CoinConfig, Wallet

pytestmark = pytest.mark.django_db


@pytest.fixture
def player():
    return get_user_model().objects.create_user(
        username="program_player",
        email="program@local.test",
        password="secret123",
        fichas=100,
    )


@pytest.fixture
def api(player):
    client = APIClient()
    client.force_authenticate(player)
    return client


@pytest.fixture
def staff():
    user = get_user_model().objects.create_superuser(
        username="program_staff", email="staff@local.test", password="secret123"
    )
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def season():
    BattlePassSeason.objects.all().update(active=False)
    return BattlePassSeason.objects.create(
        name="Test Season",
        starts_at=timezone.now() - timedelta(days=2),
        ends_at=timezone.now() + timedelta(days=20),
    )


@pytest.fixture
def supporter():
    user = get_user_model().objects.create_user(
        username="creator", email="creator@local.test", password="secret123"
    )
    return Supporter.objects.create(
        user=user,
        name="Creator",
        channel_url="https://example.com",
        status="approved",
        commission_percent=10,
    )


def test_supporter_cannot_self_approve(api, player):
    result = api.post(
        "/api/v1/customer/supporters/",
        {
            "name": "Creator",
            "channel_url": "https://example.com",
            "status": "approved",
            "commission_percent": 100,
        },
        format="json",
    )
    assert result.status_code == 200, result.data
    row = Supporter.objects.get(user=player)
    assert row.status == "pending" and row.commission_percent == 0
    assert api.get("/api/v1/staff/supporters/").status_code == 403


def test_supporter_review_and_payout_are_once(staff, supporter):
    purchase = ShopPurchase.objects.create(user=supporter.user, total=100)
    Commission.objects.create(supporter=supporter, purchase=purchase, amount=10)
    client = APIClient()
    client.force_authenticate(supporter.user)
    result = client.post("/api/v1/customer/supporters/payout/", {}, format="json")
    assert result.status_code == 201, result.data
    assert (
        client.post(
            "/api/v1/customer/supporters/payout/", {}, format="json"
        ).status_code
        == 400
    )
    url = f"/api/v1/staff/supporter-payouts/{result.data['id']}/"
    assert staff.patch(url, {"status": "paid"}, format="json").status_code == 200
    assert staff.patch(url, {"status": "paid"}, format="json").status_code == 400
    assert Wallet.objects.get(user=supporter.user).balance == 10


def test_rejected_payout_releases_only_its_commissions(staff, supporter):
    purchase = ShopPurchase.objects.create(user=supporter.user, total=100)
    commission = Commission.objects.create(
        supporter=supporter, purchase=purchase, amount=10
    )
    client = APIClient()
    client.force_authenticate(supporter.user)
    result = client.post("/api/v1/customer/supporters/payout/", {}, format="json")
    assert (
        staff.patch(
            f"/api/v1/staff/supporter-payouts/{result.data['id']}/",
            {"status": "rejected"},
            format="json",
        ).status_code
        == 200
    )
    commission.refresh_from_db()
    assert commission.payout_id is None
    assert (
        client.post(
            "/api/v1/customer/supporters/payout/", {}, format="json"
        ).status_code
        == 201
    )


def test_roadmap_publication_and_staff_permissions(api, staff):
    public = RoadmapEntry.objects.create(title="Visible", description="Details")
    private = RoadmapEntry.objects.create(
        title="Private", description="Draft", published=False
    )
    anonymous = APIClient()
    assert len(anonymous.get("/api/v1/public/roadmap/").data) == 1
    assert anonymous.get(f"/api/v1/public/roadmap/{private.id}/").status_code == 404
    assert api.post("/api/v1/staff/roadmap/", {}, format="json").status_code == 403
    response = staff.patch(
        f"/api/v1/staff/roadmap/{public.id}/", {"status": "completed"}, format="json"
    )
    assert response.status_code == 200 and response.data["progress"] == 100


@pytest.mark.parametrize(
    "code,path",
    [
        ("shop", "shared/shop/catalog/"),
        ("supporters", "customer/supporters/"),
        ("roadmap", "public/roadmap/"),
        ("battle-pass", "customer/games/battle-pass/details/"),
        ("fishing", "customer/games/fishing/details/"),
    ],
)
def test_resource_gate_enforced_on_api(api, staff, code, path):
    SystemResource.objects.update_or_create(
        code=code, defaults={"name": code, "category": "test", "enabled": False}
    )
    assert api.get("/api/v1/" + path).status_code == 403
    assert staff.get("/api/v1/staff/resources/").status_code == 200
    resource = SystemResource.objects.get(code=code)
    assert (
        staff.patch(
            f"/api/v1/staff/resources/{resource.id}/", {"enabled": True}, format="json"
        ).status_code
        == 200
    )
    assert api.get("/api/v1/" + path).status_code == 200


def test_package_coupon_bonus_checkout_and_commission(api, player, supporter):
    Wallet.objects.create(user=player, balance=100, bonus_balance=20)
    item = ShopItem.objects.create(name="Adena", item_id=57, price=10, quantity=100)
    package = ShopPackage.objects.create(name="Bundle", total_price=100)
    ShopPackageItem.objects.create(package=package, item=item, quantity=3)
    promo = PromotionCode.objects.create(
        code="CREATOR", percent=10, max_uses=1, supporter=supporter
    )
    assert (
        api.post(
            "/api/v1/shared/shop/commerce/packages/",
            {"package_id": str(package.id), "quantity": 1},
            format="json",
        ).status_code
        == 200
    )
    result = api.post(
        "/api/v1/shared/shop/commerce/options/",
        {"promo_code": "creator", "use_bonus": True},
        format="json",
    )
    assert result.status_code == 200, result.data
    assert result.data["balance_due"] == "70.00"
    key = str(uuid4())
    first = api.post(
        "/api/v1/shared/shop/checkout/", {"request_key": key}, format="json"
    )
    second = api.post(
        "/api/v1/shared/shop/checkout/", {"request_key": key}, format="json"
    )
    assert first.status_code == 200, first.data
    assert first.data == second.data
    wallet = Wallet.objects.get(user=player)
    assert wallet.balance == 30 and wallet.bonus_balance == 0
    assert BagItem.objects.get(bag__user=player, item_id=57).quantity == 300
    assert Commission.objects.get(supporter=supporter).amount == 7
    promo.refresh_from_db()
    assert promo.uses == 1
    assert len(api.get("/api/v1/shared/shop/commerce/purchases/").data[0]["items"]) == 1


@pytest.mark.parametrize("mode", ["expired", "future", "exhausted", "inactive"])
def test_invalid_coupons(api, mode):
    values = {"code": "BAD", "percent": 10}
    if mode == "expired":
        values["ends_at"] = timezone.now() - timedelta(days=1)
    if mode == "future":
        values["starts_at"] = timezone.now() + timedelta(days=1)
    if mode == "exhausted":
        values.update(max_uses=1, uses=1)
    if mode == "inactive":
        values["active"] = False
    PromotionCode.objects.create(**values)
    result = api.post(
        "/api/v1/shared/shop/commerce/options/", {"promo_code": "BAD"}, format="json"
    )
    assert result.status_code == 400


def test_staff_can_create_packages_and_game_configuration(staff, season):
    item = ShopItem.objects.create(name="Adena", item_id=57, price=1)
    result = staff.post(
        "/api/v1/staff/commerce/packages/",
        {
            "name": "Pack",
            "total_price": "5.00",
            "items": [{"item": str(item.id), "quantity": 2}],
        },
        format="json",
    )
    assert result.status_code == 201, result.data
    result = staff.post(
        "/api/v1/staff/game-content/quests/",
        {
            "season": str(season.id),
            "name": "Play",
            "event": "dice",
            "target": 2,
            "xp": 20,
            "period": "daily",
        },
        format="json",
    )
    assert result.status_code == 201, result.data
    assert result.data["season"] == season.id


def test_quest_progress_is_verified_and_claim_is_once(api, player, season):
    quest = BattlePassQuest.objects.create(
        season=season, name="Spin twice", event="roulette", target=2, xp=40
    )
    url = "/api/v1/customer/games/battle-pass/details/"
    body = {"action": "quest", "entry_id": str(quest.id)}
    assert api.post(url, body, format="json").status_code == 400
    SpinHistory.objects.create(user=player)
    SpinHistory.objects.create(user=player)
    response = api.post(url, body, format="json")
    assert response.status_code == 200, response.data
    assert response.data["statistics"]["xp"] == 40
    assert api.post(url, body, format="json").status_code == 400
    assert BattlePassQuestClaim.objects.filter(user=player).count() == 1


def test_auto_claim_only_unlocked_nonpremium_and_no_duplicates(api, player, season):
    level = BattlePassLevel.objects.create(season=season, level=1, required_xp=20)
    regular = BattlePassReward.objects.create(level_row=level, item_id=57, quantity=5)
    premium = BattlePassReward.objects.create(
        level_row=level, item_id=4037, quantity=1, is_premium=True
    )
    api.post(
        "/api/v1/customer/games/battle-pass/details/",
        {"action": "auto-claim", "enabled": True},
        format="json",
    )
    from apps.games.application.battle_pass_xp import add_battle_pass_xp

    add_battle_pass_xp(player, 30)
    add_battle_pass_xp(player, 30)
    assert UserBattlePassClaim.objects.filter(user=player, reward=regular).count() == 1
    assert not UserBattlePassClaim.objects.filter(user=player, reward=premium).exists()
    assert BagItem.objects.get(bag__user=player, item_id=57).quantity == 5


def test_exchange_requires_exact_items_and_honors_limit(api, player, season):
    row = BattlePassExchange.objects.create(
        season=season,
        name="Exchange",
        required_item_id=57,
        required_enchant=3,
        required_quantity=5,
        rewards=[{"kind": "tokens", "quantity": 10}],
        limit_per_user=1,
    )
    bag = Bag.objects.create(user=player)
    BagItem.objects.create(
        bag=bag, item_id=57, item_name="Adena", enchant=0, quantity=10
    )
    body = {"action": "exchange", "entry_id": str(row.id)}
    url = "/api/v1/customer/games/battle-pass/details/"
    assert api.post(url, body, format="json").status_code == 400
    BagItem.objects.create(
        bag=bag, item_id=57, item_name="Adena", enchant=3, quantity=5
    )
    assert api.post(url, body, format="json").status_code == 200
    assert api.post(url, body, format="json").status_code == 400
    player.refresh_from_db()
    assert player.fichas == 110


def test_milestone_claim_and_expired_pass(api, player, season):
    milestone = BattlePassMilestone.objects.create(
        season=season,
        name="Milestone",
        required_xp=10,
        rewards=[{"kind": "bonus", "quantity": "3.00"}],
    )
    UserBattlePassProgress.objects.create(user=player, season=season, xp=10)
    body = {"action": "milestone", "entry_id": str(milestone.id)}
    assert (
        api.post(
            "/api/v1/customer/games/battle-pass/details/", body, format="json"
        ).status_code
        == 200
    )
    assert (
        api.post(
            "/api/v1/customer/games/battle-pass/details/", body, format="json"
        ).status_code
        == 400
    )
    assert Wallet.objects.get(user=player).bonus_balance == 3
    season.ends_at = timezone.now() - timedelta(seconds=1)
    season.save()
    assert api.get("/api/v1/customer/games/battle-pass/").data["season"] is None


def test_daily_season_and_pool_reward_once(api, player):
    GameConfig.objects.update_or_create(
        code="daily_bonus", defaults={"name": "Daily", "active": True}
    )
    season = DailyBonusSeason.objects.create(
        name="Daily",
        starts_on=timezone.localdate(),
        ends_on=timezone.localdate() + timedelta(days=2),
    )
    DailyBonusDay.objects.create(
        season=season,
        day=1,
        rewards=[{"kind": "item", "item_id": 57, "name": "Adena", "quantity": 5}],
    )
    DailyBonusPoolEntry.objects.create(
        season=season,
        name="Extra",
        weight=1,
        rewards=[{"kind": "tokens", "quantity": 3}],
    )
    response = api.post("/api/v1/customer/games/daily-bonus/", {}, format="json")
    assert response.status_code == 200, response.data
    assert (
        api.post("/api/v1/customer/games/daily-bonus/", {}, format="json").status_code
        == 400
    )
    player.refresh_from_db()
    assert player.fichas == 103
    assert BagItem.objects.get(bag__user=player, item_id=57).quantity == 5
    assert (
        len(api.get("/api/v1/customer/games/daily-bonus/details/").data["history"]) == 1
    )


def test_bait_purchase_and_consumption(api, player):
    GameConfig.objects.update_or_create(
        code="fishing",
        defaults={"name": "Fishing", "active": True, "settings": {"cost_per_cast": 1}},
    )
    bait = FishingBait.objects.create(name="Bait", price=5, success_bonus=20)
    response = api.post(
        "/api/v1/customer/games/fishing/details/",
        {"bait_id": str(bait.id), "quantity": 2},
        format="json",
    )
    assert response.status_code == 200, response.data
    assert response.data["fichas"] == 90
    response = api.post(
        "/api/v1/customer/games/fishing/", {"bait_id": str(bait.id)}, format="json"
    )
    assert response.status_code == 200, response.data
    assert UserFishingBait.objects.get(user=player, bait=bait).quantity == 1


@pytest.mark.parametrize("kind", ["roulette", "dice", "slots", "fishing", "economy"])
def test_statistics_endpoints(api, kind):
    response = api.get(f"/api/v1/customer/games/statistics/{kind}/")
    assert response.status_code == 200, response.data
    assert response.data["plays"] == 0


@pytest.mark.parametrize(
    "kind",
    [
        "seasons",
        "levels",
        "rewards",
        "quests",
        "exchanges",
        "milestones",
        "daily-seasons",
        "daily-days",
        "daily-pool",
        "baits",
    ],
)
def test_game_admin_reads_and_permissions(api, staff, kind):
    assert api.get(f"/api/v1/staff/game-content/{kind}/").status_code == 403
    result = staff.get(f"/api/v1/staff/game-content/{kind}/")
    assert result.status_code == 200, result.data


def test_invalid_rewards_and_overlapping_seasons_rejected(staff, season):
    response = staff.post(
        "/api/v1/staff/game-content/milestones/",
        {
            "season": str(season.id),
            "name": "Bad",
            "required_xp": 1,
            "rewards": [{"kind": "tokens", "quantity": -1}],
        },
        format="json",
    )
    assert response.status_code == 400, response.data
    response = staff.post(
        "/api/v1/staff/game-content/seasons/",
        {
            "name": "Overlap",
            "starts_at": season.starts_at.isoformat(),
            "ends_at": season.ends_at.isoformat(),
        },
        format="json",
    )
    assert response.status_code == 400, response.data


def test_exchange_coins_retries_without_double_debit(player):
    from apps.wallet.application.exchange import ExchangeCoinsUseCase
    from apps.server.domain.gateways import GameCharacter
    from apps.wallet.infrastructure.exchange_models import GameExchange

    class Access:
        def can_access(self, *args):
            return True

    class Gateway:
        calls = 0
        receipts = set()

        def get_character(self, *args):
            return GameCharacter(1, "Hero", 80, False, 0)

        def exchange_coins(self, receipt, *args):
            self.receipts.add(receipt)
            self.calls += 1
            if self.calls == 1:
                raise TimeoutError("Commit confirmed only on retry")

    CoinConfig.objects.create(name="Coin", coin_id=57, multiplier=1, active=True)
    Wallet.objects.create(user=player, balance=100)
    gateway = Gateway()
    case = ExchangeCoinsUseCase(gateway, Access())
    data = {
        "request_key": uuid4(),
        "direction": "to_game",
        "login": "player",
        "character_id": 1,
        "quantity": 10,
    }
    assert case.execute(player, data)["status"] == "pending"
    assert Wallet.objects.get(user=player).balance == 90
    assert case.execute(player, data)["status"] == "completed"
    assert case.execute(player, data)["status"] == "completed"
    assert len(gateway.receipts) == 1 and gateway.calls == 2
    assert Wallet.objects.get(user=player).balance == 90
    assert GameExchange.objects.count() == 1
