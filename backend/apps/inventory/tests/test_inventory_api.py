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


@pytest.mark.django_db
def test_trade_moves_panel_item_between_characters(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    from common.di.bootstrap import DependencyInjection

    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    origin_char = gateway.seed_character("hero", "Origin", items=[GameItem(57, "Adena", 1000, 0)])
    gateway.seed_character("hero", "Destination")

    withdrawn = api.post(
        "/api/v1/customer/inventory/withdraw/",
        {"char_id": origin_char.char_id, "item_id": 57, "quantity": 100},
        format="json",
    )
    assert withdrawn.status_code == 200, withdrawn.data

    dashboard = api.get("/api/v1/customer/inventory/")
    inventories = {row["character_name"]: row for row in dashboard.data}
    traded = api.post(
        "/api/v1/customer/inventory/trade/",
        {
            "origin_inventory_id": inventories["Origin"]["inventory_id"],
            "destination_inventory_id": inventories["Destination"]["inventory_id"],
            "item_id": 57,
            "quantity": 40,
            "enchant": 0,
        },
        format="json",
    )
    assert traded.status_code == 200, traded.data

    updated = api.get("/api/v1/customer/inventory/")
    updated_inventories = {row["character_name"]: row for row in updated.data}
    assert updated_inventories["Origin"]["items"][0]["quantity"] == 60
    assert updated_inventories["Destination"]["items"][0]["quantity"] == 40


@pytest.mark.django_db
def test_withdraw_rejects_item_marked_not_tradeable_in_xml(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    from common.di.bootstrap import DependencyInjection

    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character("hero", "LockedItemOwner", items=[GameItem(6, "Apprentice's Wand", 1, 0)])

    listed = api.get(f"/api/v1/customer/inventory/characters/{char.char_id}/items/")
    assert listed.status_code == 200
    assert listed.data[0]["tradeable"] is False

    response = api.post(
        "/api/v1/customer/inventory/withdraw/",
        {"char_id": char.char_id, "item_id": 6, "quantity": 1},
        format="json",
    )

    assert response.status_code == 400
    assert response.data["error_code"] == "ITEM_BLOCKED"
    assert gateway.list_character_items(char.char_id)[0].quantity == 1


@pytest.mark.django_db
def test_character_equipment_is_read_only_and_scoped_to_the_account(api, player):
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    from common.di.bootstrap import DependencyInjection

    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character(
        "hero",
        "SirHero",
        items=[
            GameItem(57, "Adena", 1000, 0),
            GameItem(2413, "Helmet", 1, 3, slot=6),
            GameItem(10, "Sword", 1, 7, slot=7),
        ],
    )

    response = api.get(f"/api/v1/customer/inventory/characters/{char.char_id}/equipment/")

    assert response.status_code == 200
    from apps.server.infrastructure.lineage.item_catalog import item_metadata
    assert [{key: row[key] for key in ("item_id", "quantity", "enchant", "slot")} for row in response.data] == [
        {"item_id": 2413, "quantity": 1, "enchant": 3, "slot": 6},
        {"item_id": 10, "quantity": 1, "enchant": 7, "slot": 7},
    ]
    for row in response.data:
        assert row["name"] == item_metadata(row["item_id"])["name"]
        assert row["item_metadata"] == item_metadata(row["item_id"])
    assert api.post(f"/api/v1/customer/inventory/characters/{char.char_id}/equipment/").status_code == 405
