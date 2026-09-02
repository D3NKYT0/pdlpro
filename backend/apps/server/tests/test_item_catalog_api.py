from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.infrastructure.lineage.item_catalog import get_item_catalog, item_metadata
from apps.server.presentation.item_metadata import with_item_metadata
from apps.shop.infrastructure.models import ShopItem
from apps.games.infrastructure.models import Prize


@pytest.fixture
def custom_catalog(tmp_path, settings):
    (tmp_path / "items.xml").write_text('''<list>
      <weapon id="57" name="Custom Currency">
        <set name="type" value="SWORD"/><set name="crystal_type" value="A"/>
        <set name="icon" value="icon.custom_currency"/><set name="tradeable" value="false"/>
      </weapon><etcitem id="858" name="Custom Earring"><set name="icon" value="icon.earring"/></etcitem>
    </list>''', encoding="utf-8")
    settings.LINEAGE_ITEM_XML_DIR = str(tmp_path)
    settings.LINEAGE_DB_ENABLED = False
    get_item_catalog.cache_clear()
    yield
    get_item_catalog.cache_clear()


@pytest.mark.django_db
def test_public_catalog_uses_configured_xml_without_game_connection(custom_catalog):
    response = APIClient().get("/api/v1/public/items/catalog/")
    assert response.status_code == 200
    assert response["Cache-Control"] == "public, max-age=60"
    assert response.data["default_icon_url"] == "/item-icons/default.jpg"
    rows = {row["id"]: row for row in response.data["items"]}
    assert set(rows) == {"57", "858"}
    assert rows["57"]["name"] == "Custom Currency"
    assert rows["57"]["grade"] == "A"
    assert rows["57"]["category"] == "WEAPON"
    assert rows["57"]["tradeable"] is False
    assert rows["57"]["icon_url"] == "/item-icons/57.jpg"
    assert rows["57"]["icon_reference"] == "icon.custom_currency"
    assert rows["858"]["icon_url"] == "/item-icons/11598.jpg"


@pytest.mark.django_db
def test_response_adapter_preserves_values_and_never_mutates_stored_payload(custom_catalog):
    row = {"id": str(uuid4()), "item_id": 57, "item_name": "Old saved name", "quantity": 9007199254740993,
           "price": Decimal("10.50"), "enchant": 7}
    data = with_item_metadata({"items": [row], "name": "Container label"})
    assert row["item_name"] == "Old saved name"
    assert data["name"] == "Container label"
    assert data["items"][0]["item_name"] == "Custom Currency"
    for key in ("id", "item_id", "quantity", "price", "enchant"):
        assert data["items"][0][key] == row[key]
    for invalid in (str(uuid4()), True, None, -1, "../57", "99999999999999"):
        value = {"item_id": invalid, "name": "Not a L2 item"}
        assert with_item_metadata(value) == value
    assert item_metadata(99999)["catalog_found"] is False
    assert item_metadata(99999)["icon_url"] == "/item-icons/default.jpg"


@pytest.mark.django_db
def test_shop_games_and_staff_share_exact_metadata(custom_catalog):
    user = get_user_model().objects.create_superuser(username="catalog-admin", email="catalog@example.invalid", password="test")
    shop = ShopItem.objects.create(item_id=57, name="Old shop name", price="10.50", quantity=3)
    Prize.objects.create(name="Old prize name", item_id=57, weight=1, active=True)
    client = APIClient()
    public = client.get("/api/v1/shared/shop/catalog/").data[0]
    client.force_authenticate(user)
    staff = client.get("/api/v1/staff/shop/").data[0]
    prizes = client.get("/api/v1/customer/games/roulette/").data["prizes"]
    # Use the same metadata service for HTTP output without overwriting legacy records.
    assert public["name"] == staff["name"] == "Custom Currency"
    assert public["item_metadata"] == staff["item_metadata"] == item_metadata(57)
    assert prizes[0]["name"] == "Custom Currency"
    assert prizes[0]["item_metadata"] == public["item_metadata"]
    assert public["quantity"] == 3
    shop.refresh_from_db()
    assert shop.name == "Old shop name"
    response = client.post("/api/v1/staff/shop/", {"item_id": 57, "name": "Spoofed", "price": "1.00", "quantity": 1}, format="json")
    assert response.status_code == 200
    assert response.data["name"] == "Custom Currency"
    assert ShopItem.objects.get(id=response.data["id"]).name == "Custom Currency"
