from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.shop.domain.autoconfig import SHOP_ITEM_SKUS, SHOP_PACKAGES
from apps.shop.infrastructure.models import ShopItem, ShopPackage, ShopPackageItem

User = get_user_model()
AUTOCONFIG = "/api/v1/staff/shop/autoconfig/"


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
def test_player_cannot_autoconfig_shop(api, player):
    api.force_authenticate(user=player)
    response = api.post(AUTOCONFIG, {}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_shop_autoconfig_creates_low_grade_items_and_packages(api, staff):
    api.force_authenticate(user=staff)
    first = api.post(AUTOCONFIG, {}, format="json")
    assert first.status_code == 200, first.data
    assert first.data["created"]["items"] == len(SHOP_ITEM_SKUS)
    assert first.data["created"]["packages"] == len(SHOP_PACKAGES)
    assert first.data["items_total"] == len(SHOP_ITEM_SKUS)
    assert first.data["packages_total"] == len(SHOP_PACKAGES)

    soulshot = ShopItem.objects.get(item_id=1835, quantity=10_000)
    assert soulshot.name == "Soulshot: No Grade"
    assert str(soulshot.price) == "6.00"
    assert soulshot.active is True
    assert ShopItem.objects.get(item_id=57, quantity=1_000_000).name == "Adena"
    assert ShopItem.objects.get(item_id=3470, quantity=1).name == "Gold Bar"
    assert ShopItem.objects.filter(item_id=1463, quantity=10_000).exists()
    assert ShopItem.objects.filter(item_id=955, quantity=1).exists()
    assert ShopItem.objects.filter(item_id=5592, quantity=50).exists()

    starter = ShopPackage.objects.get(name="Kit Iniciante")
    assert str(starter.total_price) == "16.00"
    assert starter.active is True
    grants = {
        (row.item.item_id, row.quantity * row.item.quantity)
        for row in starter.package_items.select_related("item")
    }
    assert grants == {(57, 1_000_000), (1835, 10_000), (1061, 100), (736, 50)}
    assert ShopPackage.objects.filter(name="Kit PvP").exists()
    assert ShopPackage.objects.filter(name="Kit Encante D").exists()
    assert ShopPackage.objects.filter(name="Pacote Premium").exists()

    catalog = api.get("/api/v1/shared/shop/catalog/")
    assert catalog.status_code == 200
    catalog_ids = {(row["item_id"], row["quantity"]) for row in catalog.data}
    assert (1835, 10_000) in catalog_ids
    assert (57, 5_000_000) in catalog_ids

    packs = api.get("/api/v1/shared/shop/commerce/packages/")
    assert packs.status_code == 200
    names = {row["name"] for row in packs.data}
    assert "Kit Iniciante" in names
    assert "Kit Farm D" in names
    starter_payload = next(row for row in packs.data if row["name"] == "Kit Iniciante")
    assert any(entry["grant_quantity"] == 1_000_000 and entry["item_id"] == 57 for entry in starter_payload["contents"])

    second = api.post(AUTOCONFIG, {}, format="json")
    assert second.status_code == 200, second.data
    assert second.data["created"]["items"] == 0
    assert second.data["created"]["packages"] == 0
    assert ShopItem.objects.count() == len(SHOP_ITEM_SKUS)
    assert ShopPackage.objects.count() == len(SHOP_PACKAGES)
    assert ShopPackageItem.objects.count() == sum(len(spec.items) for spec in SHOP_PACKAGES)


@pytest.mark.django_db
def test_shop_autoconfig_keeps_custom_price_and_existing_package(api, staff):
    ShopItem.objects.create(name="Adena custom", item_id=57, price="99.00", quantity=1_000_000, active=False)
    ShopPackage.objects.create(name="Kit Iniciante", total_price="1.00", active=False)
    api.force_authenticate(user=staff)
    response = api.post(AUTOCONFIG, {}, format="json")
    assert response.status_code == 200, response.data
    assert response.data["created"]["items"] == len(SHOP_ITEM_SKUS) - 1
    assert response.data["created"]["packages"] == len(SHOP_PACKAGES) - 1
    adena = ShopItem.objects.get(item_id=57, quantity=1_000_000)
    assert adena.name == "Adena custom"
    assert str(adena.price) == "99.00"
    assert adena.active is False
    pack = ShopPackage.objects.get(name="Kit Iniciante")
    assert str(pack.total_price) == "1.00"
    assert pack.active is False
    assert pack.package_items.count() == 0
