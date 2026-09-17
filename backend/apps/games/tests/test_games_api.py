from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
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
    assert DailyBonusClaim.objects.filter(user=player, claimed_on=timezone.localdate()).count() == 1


@pytest.mark.django_db
def test_buy_tokens_and_spin_roulette(api, player):
    GameConfig.objects.update_or_create(
        code="roulette",
        defaults={"name": "Roleta", "active": True, "settings": {"cost": 1, "fail_chance": 0}},
    )
    Prize.objects.create(name="Adena", item_id=57, quantity=50_000, weight=10, rarity="comum")
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/tokens/", {"amount": 5}, format="json")
    assert bought.status_code == 200, bought.data
    assert bought.data["fichas"] == 5
    listed = api.get("/api/v1/customer/games/roulette/")
    assert listed.status_code == 200
    assert listed.data["prizes"][0]["quantity"] == 50_000
    spin = api.post("/api/v1/customer/games/roulette/")
    assert spin.status_code == 200, spin.data
    assert spin.data["failed"] is False
    assert spin.data["prize"]["name"] == "Adena"
    assert spin.data["prize"]["quantity"] == 50_000
    bag = api.get("/api/v1/customer/games/bag/")
    assert bag.status_code == 200
    assert bag.data[0]["item_name"] == "Adena"
    assert bag.data[0]["quantity"] == 50_000


@pytest.mark.django_db
def test_buy_and_open_box(api, player):
    from apps.games.infrastructure.models import BoxType, CatalogItem

    CatalogItem.objects.create(name="Scroll", item_id=736, quantity=20, rarity="common", weight=10)
    CatalogItem.objects.create(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    box_type = BoxType.objects.create(name="Bronze", price=Decimal("5.00"), boosters_amount=2)
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    player.fichas = 3
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert bought.status_code == 200, bought.data
    assert bought.data["remaining"] == 2
    listed = api.get("/api/v1/customer/games/boxes/")
    assert listed.data["boxes"][0]["type_id"] == str(box_type.id)
    opened = api.post(f"/api/v1/customer/games/boxes/{bought.data['id']}/open/")
    assert opened.status_code == 200, opened.data
    from apps.server.infrastructure.lineage.item_catalog import item_metadata
    assert opened.data["item"]["name"] == item_metadata(opened.data["item"]["item_id"])["name"]
    assert opened.data["item"]["item_id"] in {736, 6658}
    expected_qty = 20 if opened.data["item"]["item_id"] == 736 else 1
    assert opened.data["item"]["quantity"] == expected_qty
    assert opened.data["remaining"] == 1
    assert opened.data["fichas"] == 2
    player.refresh_from_db()
    assert player.fichas == 2
    bag = api.get("/api/v1/customer/games/bag/")
    assert bag.data[0]["quantity"] == expected_qty
    player.fichas = 0
    player.save(update_fields=["fichas"])
    refused = api.post(f"/api/v1/customer/games/boxes/{bought.data['id']}/open/")
    assert refused.status_code == 400
    assert refused.data["error_code"] == "INSUFFICIENT_TOKENS"


@pytest.mark.django_db
def test_cannot_reset_box_before_opening_a_pack(api, player):
    from apps.games.infrastructure.models import BoxType, CatalogItem

    CatalogItem.objects.create(name="Scroll", item_id=736, quantity=20, rarity="common", weight=10)
    CatalogItem.objects.create(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    box_type = BoxType.objects.create(name="Bronze", price=Decimal("5.00"), boosters_amount=4)
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert bought.status_code == 200, bought.data
    refused = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert refused.status_code == 400
    assert refused.data["error_code"] == "BOX_RESET_BLOCKED"
    player.refresh_from_db()
    from apps.wallet.infrastructure.models import Wallet as WalletModel

    assert WalletModel.objects.get(user=player).balance == Decimal("15.00")


@pytest.mark.django_db
def test_can_reset_box_after_opening_a_pack(api, player):
    from apps.games.infrastructure.models import BoxType, CatalogItem

    CatalogItem.objects.create(name="Scroll", item_id=736, quantity=20, rarity="common", weight=10)
    CatalogItem.objects.create(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    box_type = BoxType.objects.create(name="Bronze", price=Decimal("5.00"), boosters_amount=4)
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    player.fichas = 2
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert bought.status_code == 200, bought.data
    opened = api.post(f"/api/v1/customer/games/boxes/{bought.data['id']}/open/")
    assert opened.status_code == 200, opened.data
    reset = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert reset.status_code == 200, reset.data
    assert reset.data["remaining"] == 4
    listed = api.get("/api/v1/customer/games/boxes/")
    assert listed.data["boxes"][0]["remaining"] == 4
    assert listed.data["boxes"][0]["total"] == 4


@pytest.mark.django_db
def test_bought_box_always_contains_one_hunt_item(api, player):
    from apps.games.infrastructure.models import BoxSlot, BoxType, CatalogItem

    hunt = CatalogItem.objects.create(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    filler = CatalogItem.objects.create(name="Adena", item_id=57, quantity=80_000, rarity="common", weight=28)
    box_type = BoxType.objects.create(name="Baú Lendário", price=Decimal("10.00"), boosters_amount=8)
    box_type.items.add(hunt, filler)
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    player.fichas = 8
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert bought.status_code == 200, bought.data
    slots = list(BoxSlot.objects.filter(box__id=bought.data["id"]))
    assert len(slots) == 8
    assert sum(1 for slot in slots if slot.item_id == 6658) == 1
    listed = api.get("/api/v1/customer/games/boxes/")
    assert listed.data["boxes"][0]["hunt_remaining"] is True
    hunts = 0
    for _ in range(8):
        opened = api.post(f"/api/v1/customer/games/boxes/{bought.data['id']}/open/")
        assert opened.status_code == 200, opened.data
        hunts += int(opened.data["hunt"])
        if opened.data["hunt"]:
            listed = api.get("/api/v1/customer/games/boxes/")
            if opened.data["remaining"] == 0:
                assert listed.data["boxes"] == []
            else:
                assert listed.data["boxes"][0]["hunt_remaining"] is False
        if opened.data["remaining"] == 0:
            break
    assert hunts == 1


@pytest.mark.django_db
def test_fillers_never_include_another_legendary(api, player):
    from apps.games.infrastructure.models import BoxSlot, BoxType, CatalogItem

    hunt = CatalogItem.objects.create(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    extra = CatalogItem.objects.create(name="Blessed Enchant S", item_id=6577, rarity="legendary", weight=1)
    filler = CatalogItem.objects.create(name="Adena", item_id=57, quantity=80_000, rarity="common", weight=28)
    box_type = BoxType.objects.create(name="Baú Comum", price=Decimal("10.00"), boosters_amount=20)
    box_type.items.add(hunt, extra, filler)
    Wallet.objects.create(user=player, balance=Decimal("20.00"))
    api.force_authenticate(user=player)
    bought = api.post("/api/v1/customer/games/boxes/", {"box_type_id": str(box_type.id)}, format="json")
    assert bought.status_code == 200, bought.data
    slots = list(BoxSlot.objects.filter(box__id=bought.data["id"]))
    assert len(slots) == 20
    assert sum(1 for slot in slots if slot.item_id == 6658) == 1
    assert sum(1 for slot in slots if slot.item_id == 6577) == 0
    assert sum(1 for slot in slots if slot.rarity == "legendary") == 1


@pytest.mark.django_db
def test_shop_shows_legendary_hunt_on_common_box(api, player):
    from apps.games.infrastructure.models import BoxType, CatalogItem

    CatalogItem.objects.create(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    filler = CatalogItem.objects.create(name="Adena", item_id=57, quantity=80_000, rarity="common", weight=28)
    box_type = BoxType.objects.create(name="Baú Comum", price=Decimal("10.00"), boosters_amount=20)
    box_type.items.add(filler)
    api.force_authenticate(user=player)
    listed = api.get("/api/v1/customer/games/boxes/")
    assert listed.status_code == 200
    row = next(item for item in listed.data["types"] if item["id"] == str(box_type.id))
    assert row["featured"]["item_id"] == 6658
    assert row["featured"]["rarity"] == "legendary"


@pytest.mark.django_db
def test_list_boxes_shows_the_hunt_item(api, player):
    from apps.games.infrastructure.models import BoxType, CatalogItem

    hunt = CatalogItem.objects.create(name="Ring of Baium", item_id=6658, rarity="legendary", weight=1)
    filler = CatalogItem.objects.create(name="Adena", item_id=57, quantity=80_000, rarity="common", weight=28)
    box_type = BoxType.objects.create(name="Baú Lendário", price=Decimal("100.00"), boosters_amount=12)
    box_type.items.add(hunt, filler)
    api.force_authenticate(user=player)
    listed = api.get("/api/v1/customer/games/boxes/")
    assert listed.status_code == 200
    row = listed.data["types"][0]
    assert row["id"] == str(box_type.id)
    assert row["featured"]["item_id"] == 6658
    assert row["featured"]["name"] == "Ring of Baium"
    assert {item["item_id"] for item in row["items"]} == {57}


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

    from apps.games.infrastructure.models import Fish, FishingBait, UserFishingBait

    GameConfig.objects.update_or_create(
        code="fishing",
        defaults={"name": "Pesca", "active": True, "settings": {"cost_per_cast": 1, "baits_per_token": 10}},
    )
    fish = Fish.objects.create(
        name="Lambari Teste",
        rarity="common",
        min_rod_level=1,
        weight=10,
        xp_reward=10,
        item_id=1835,
        item_name="Soulshot: No Grade",
        quantity=800,
    )
    bait = FishingBait.objects.create(name="Minhoca", price=1, success_bonus=5, active=True)
    UserFishingBait.objects.create(user=player, bait=bait, quantity=2)
    player.fichas = 0
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    missing = api.post("/api/v1/customer/games/fishing/")
    assert missing.status_code == 400
    with (
        patch("apps.games.application.fishing_use_cases.random.randint", return_value=1),
        patch("apps.games.application.fishing_use_cases.random.choices", return_value=[fish]),
    ):
        cast = api.post("/api/v1/customer/games/fishing/", {"bait_id": str(bait.id)}, format="json")
    assert cast.status_code == 200, cast.data
    assert cast.data["success"] is True
    assert cast.data["fish"]["name"] == "Lambari Teste"
    assert cast.data["baits"] == 1
    assert cast.data["fichas"] == 0
    assert UserFishingBait.objects.get(user=player, bait=bait).quantity == 1
    state = api.get("/api/v1/customer/games/fishing/")
    assert state.status_code == 200
    assert state.data["rod"]["xp"] >= 10
    assert state.data["baits"] == 1
    assert state.data["baits_per_token"] == 10
    bag = api.get("/api/v1/customer/games/bag/")
    assert bag.data[0]["item_id"] == 1835
    assert bag.data[0]["quantity"] == 800


@pytest.mark.django_db
def test_fishing_exchanges_tokens_for_bait_packs(api, player):
    from apps.games.infrastructure.models import FishingBait, UserFishingBait

    GameConfig.objects.update_or_create(
        code="fishing",
        defaults={"name": "Pesca", "active": True, "settings": {"cost_per_cast": 1, "baits_per_token": 10}},
    )
    bait = FishingBait.objects.create(name="Pacote", price=8, success_bonus=0, active=True)
    player.fichas = 3
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    bought = api.post(
        "/api/v1/customer/games/fishing/details/",
        {"bait_id": str(bait.id), "quantity": 1},
        format="json",
    )
    assert bought.status_code == 200, bought.data
    assert bought.data["fichas"] == 2
    assert bought.data["received"] == 10
    assert bought.data["quantity"] == 10
    assert UserFishingBait.objects.get(user=player, bait=bait).quantity == 10
    empty = api.post("/api/v1/customer/games/fishing/", {"bait_id": str(bait.id)}, format="json")
    assert empty.status_code == 200
    assert UserFishingBait.objects.get(user=player, bait=bait).quantity == 9
    player.fichas = 0
    player.save(update_fields=["fichas"])
    refused = api.post(
        "/api/v1/customer/games/fishing/details/",
        {"bait_id": str(bait.id), "quantity": 1},
        format="json",
    )
    assert refused.status_code == 400
    broke = api.post(
        "/api/v1/customer/games/fishing/",
        {"bait_id": str(FishingBait.objects.create(name="Vazia", price=1, active=True).id)},
        format="json",
    )
    assert broke.status_code == 400
    assert broke.data["message"] == "Iscas insuficientes."


@pytest.mark.django_db
def test_fishing_trades_common_bait_for_both_enchanted_kinds(api, player):
    from apps.games.infrastructure.models import FishingBait, UserFishingBait

    GameConfig.objects.update_or_create(
        code="fishing",
        defaults={"name": "Pesca", "active": True, "settings": {"cost_per_cast": 1, "baits_per_token": 10}},
    )
    FishingBait.objects.all().delete()
    common = FishingBait.objects.create(
        name="Isca comum", paid_with="tokens", price=1, success_bonus=0, active=True
    )
    apprentice = FishingBait.objects.create(
        name="Isca do aprendiz", paid_with="baits", price=3, success_bonus=5, active=True
    )
    enchanted = FishingBait.objects.create(
        name="Isca encantada", paid_with="baits", price=8, success_bonus=15, active=True
    )
    UserFishingBait.objects.create(user=player, bait=common, quantity=20)
    player.fichas = 4
    player.save(update_fields=["fichas"])
    api.force_authenticate(user=player)
    tokens = api.post(
        "/api/v1/customer/games/fishing/details/",
        {"bait_id": str(common.id), "quantity": 1},
        format="json",
    )
    assert tokens.status_code == 200, tokens.data
    assert tokens.data["fichas"] == 3
    assert tokens.data["received"] == 10
    assert UserFishingBait.objects.get(user=player, bait=common).quantity == 30
    learner = api.post(
        "/api/v1/customer/games/fishing/details/",
        {"bait_id": str(apprentice.id), "quantity": 2},
        format="json",
    )
    assert learner.status_code == 200, learner.data
    assert learner.data["received"] == 2
    assert learner.data["spent"] == 6
    assert learner.data["fichas"] == 3
    assert UserFishingBait.objects.get(user=player, bait=common).quantity == 24
    assert UserFishingBait.objects.get(user=player, bait=apprentice).quantity == 2
    rare = api.post(
        "/api/v1/customer/games/fishing/details/",
        {"bait_id": str(enchanted.id), "quantity": 1},
        format="json",
    )
    assert rare.status_code == 200, rare.data
    assert rare.data["received"] == 1
    assert UserFishingBait.objects.get(user=player, bait=common).quantity == 16
    assert UserFishingBait.objects.get(user=player, bait=enchanted).quantity == 1
    poor = api.post(
        "/api/v1/customer/games/fishing/details/",
        {"bait_id": str(enchanted.id), "quantity": 3},
        format="json",
    )
    assert poor.status_code == 400


@pytest.mark.django_db
def test_fishing_bait_and_fish_follow_request_language(api, player):
    from apps.games.infrastructure.models import Fish, FishingBait

    GameConfig.objects.update_or_create(
        code="fishing",
        defaults={"name": "Pesca", "active": True, "settings": {"cost_per_cast": 1, "baits_per_token": 10}},
    )
    FishingBait.objects.all().delete()
    FishingBait.objects.create(
        name="Isca comum",
        name_en="Common bait",
        name_es="Cebo común",
        description="Isca simples para lançar a linha.",
        description_en="Simple bait to cast the line.",
        description_es="Cebo simple para lanzar la línea.",
        paid_with="tokens",
        price=1,
        success_bonus=0,
        active=True,
    )
    FishingBait.objects.create(
        name="Isca sem tradução",
        description="Só em português.",
        paid_with="tokens",
        price=1,
        active=True,
    )
    Fish.objects.filter(name="Serafim de Eva").delete()
    Fish.objects.create(
        name="Serafim de Eva",
        name_en="Seraph of Eva",
        name_es="Serafín de Eva",
        rarity="divine",
        active=True,
    )
    api.force_authenticate(user=player)
    pt = api.get("/api/v1/customer/games/fishing/details/")
    assert pt.status_code == 200, pt.data
    names = {row["name"] for row in pt.data["baits"]}
    assert names == {"Isca comum", "Isca sem tradução"}
    serafim = next(row for row in pt.data["collection"] if row["art"] == "Serafim de Eva")
    assert serafim["name"] == "Serafim de Eva"

    en = api.get("/api/v1/customer/games/fishing/details/", HTTP_X_LANGUAGE="en")
    assert en.status_code == 200, en.data
    en_names = {row["name"] for row in en.data["baits"]}
    assert "Common bait" in en_names
    assert "Isca sem tradução" in en_names
    assert next(row for row in en.data["baits"] if row["name"] == "Common bait")[
        "description"
    ].startswith("Simple bait")
    serafim_en = next(row for row in en.data["collection"] if row["art"] == "Serafim de Eva")
    assert serafim_en["name"] == "Seraph of Eva"

    es = api.get("/api/v1/customer/games/fishing/details/", HTTP_X_LANGUAGE="es")
    assert {row["name"] for row in es.data["baits"]} >= {"Cebo común", "Isca sem tradução"}
    serafim_es = next(row for row in es.data["collection"] if row["art"] == "Serafim de Eva")
    assert serafim_es["name"] == "Serafín de Eva"


def test_divine_catch_is_rarer_than_legendary():
    from apps.games.application.fishing_use_cases import SUCCESS_CHANCE

    assert SUCCESS_CHANCE["divine"] < SUCCESS_CHANCE["legendary"]


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
    weapon.level = 9
    weapon.fragments = 10
    weapon.save(update_fields=["level", "fragments"])
    with patch("apps.games.application.economy_use_cases.random.randint", return_value=1):
        peak = api.post("/api/v1/customer/games/economy/enchant/")
    assert peak.status_code == 200
    assert peak.data["success"] is True
    assert peak.data["weapon"]["level"] == 10
    bag = api.get("/api/v1/customer/games/bag/")
    assert not any(item["item_id"] == 57 and item["quantity"] == 250_000 for item in bag.data)
    blocked = api.post("/api/v1/customer/games/economy/enchant/")
    assert blocked.status_code == 400


@pytest.mark.django_db
def test_economy_boss_grants_prize_and_resets_weapon(api, player):
    from apps.games.domain.arena_roster import ARENA_BOSS_ADENA, ARENA_WEAPON_MAX
    from apps.games.infrastructure.models import EconomyWeapon, Monster

    GameConfig.objects.update_or_create(code="economy", defaults={"name": "Economia", "active": True, "settings": {}})
    boss = Monster.objects.create(
        name="Queen Ant Teste",
        level=12,
        required_weapon_level=0,
        fragment_reward=0,
        hp=10,
        attack=1,
        defense=0,
        respawn_seconds=5,
        is_boss=True,
    )
    player.fichas = 2
    player.save(update_fields=["fichas"])
    weapon = EconomyWeapon.objects.get_or_create(user=player)[0]
    weapon.level = 0
    weapon.fragments = 4
    weapon.save(update_fields=["level", "fragments"])
    api.force_authenticate(user=player)
    too_soon = api.post(f"/api/v1/customer/games/economy/{boss.id}/fight/")
    assert too_soon.status_code == 400
    weapon.level = ARENA_WEAPON_MAX
    weapon.save(update_fields=["level"])
    state = api.get("/api/v1/customer/games/economy/")
    assert state.status_code == 200
    listed = next(row for row in state.data["monsters"] if row["id"] == str(boss.id))
    assert listed["is_boss"] is True
    fight = api.post(f"/api/v1/customer/games/economy/{boss.id}/fight/")
    assert fight.status_code == 200, fight.data
    assert fight.data["won"] is True
    assert fight.data["fragments_earned"] == 0
    assert fight.data["prize"]["item_id"] == 57
    assert fight.data["prize"]["quantity"] == ARENA_BOSS_ADENA
    assert fight.data["weapon"]["level"] == 0
    assert fight.data["weapon"]["fragments"] == 4
    bag = api.get("/api/v1/customer/games/bag/")
    assert any(item["item_id"] == 57 and item["quantity"] == ARENA_BOSS_ADENA for item in bag.data)


@pytest.mark.django_db
def test_queen_ant_loses_to_max_weapon(api, player):
    from apps.games.domain.arena_roster import ARENA_BOSS, ARENA_WEAPON_MAX
    from apps.games.infrastructure.models import EconomyWeapon, Monster

    GameConfig.objects.update_or_create(code="economy", defaults={"name": "Economia", "active": True, "settings": {}})
    name, level, weapon_req, fragments, hp, attack, defense, respawn = ARENA_BOSS
    boss = Monster.objects.create(
        name=f"{name} Stats",
        level=level,
        required_weapon_level=weapon_req,
        fragment_reward=fragments,
        hp=hp,
        attack=attack,
        defense=defense,
        respawn_seconds=respawn,
        is_boss=True,
    )
    player.fichas = 1
    player.save(update_fields=["fichas"])
    weapon = EconomyWeapon.objects.get_or_create(user=player)[0]
    weapon.level = ARENA_WEAPON_MAX
    weapon.save(update_fields=["level"])
    api.force_authenticate(user=player)
    fight = api.post(f"/api/v1/customer/games/economy/{boss.id}/fight/")
    assert fight.status_code == 200, fight.data
    assert fight.data["won"] is True
    assert fight.data["weapon"]["level"] == 0


@pytest.mark.django_db
def test_battle_pass_claim_free_reward(api, player):
    from datetime import timedelta

    from django.utils import timezone

    from apps.games.infrastructure.models import (
        BattlePassLevel,
        BattlePassReward,
        BattlePassSeason,
    )

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
