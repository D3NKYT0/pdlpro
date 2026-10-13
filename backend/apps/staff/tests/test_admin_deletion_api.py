"""Exclusão administrativa: resultado público, dependências e autorização."""

from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.content.infrastructure.models import News
from apps.games.infrastructure.models import (
    BattlePassLevel,
    BattlePassSeason,
    GameConfig,
    Prize,
    SpinHistory,
)
from apps.server.infrastructure.custom_item_models import CustomCatalogItem
from apps.shop.infrastructure.models import (
    Cart,
    CartItem,
    CartPackage,
    PromotionCode,
    ShopItem,
    ShopPackage,
    ShopPackageItem,
    ShopPurchase,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def admin():
    user = get_user_model()
    return user.objects.create_superuser(username="deletion-admin", email="deletion-admin@example.invalid", password="test")


def targets():
    news = News.objects.create(title="Published", slug="published", body="Content", is_published=True)
    item = ShopItem.objects.create(name="Item", item_id=57, price=1)
    game = GameConfig.objects.create(code="deletion-test", name="Custom", active=True)
    pack = ShopPackage.objects.create(name="Pack", total_price=1)
    promo = PromotionCode.objects.create(code="REMOVE", percent=10)
    prize = Prize.objects.create(name="Prize", item_id=57)
    custom = CustomCatalogItem.objects.create(item_id=999999, name="Custom", image="custom.png")
    return [
        ("/api/v1/staff/news/", news, True),
        ("/api/v1/staff/shop/", item, True),
        ("/api/v1/staff/games/", game, True),
        (f"/api/v1/staff/commerce/packages/{pack.id}/", pack, False),
        (f"/api/v1/staff/commerce/promos/{promo.id}/", promo, False),
        (f"/api/v1/staff/game-content/prizes/{prize.id}/", prize, False),
        (f"/api/v1/staff/custom-items/{custom.id}/", custom, False),
    ]


def test_delete_all_missing_resources_and_repeat(api, admin):
    api.force_authenticate(admin)
    for path, row, body in targets():
        response = api.delete(path, {"id": str(row.id)} if body else {}, format="json")
        assert response.status_code == 200, (path, response.data)
        assert response.data == {"deleted": True}
        assert not type(row).objects.filter(id=row.id).exists()
        repeated = api.delete(path, {"id": str(row.id)} if body else {}, format="json")
        assert repeated.status_code == 200
        assert repeated.data == {"deleted": False}
    assert not any(row["slug"] == "published" for row in api.get("/api/v1/public/news/").data)


@pytest.mark.parametrize("role", ["anonymous", "player", "staff"])
def test_delete_requires_management_permissions(api, role):
    if role != "anonymous":
        user = get_user_model().objects.create_user(username=role, email=f"{role}@example.invalid", is_staff=role == "staff")
        api.force_authenticate(user)
    for path, row, body in targets():
        response = api.delete(path, {"id": str(row.id)} if body else {}, format="json")
        assert response.status_code in (401, 403), (path, response.data)
        assert type(row).objects.filter(id=row.id).exists()


@pytest.mark.parametrize("path", ["news", "shop", "games"])
@pytest.mark.parametrize("entry_id", [None, "", "bad", 1])
def test_delete_rejects_invalid_identifiers(api, admin, path, entry_id):
    api.force_authenticate(admin)
    assert api.delete(f"/api/v1/staff/{path}/", {"id": entry_id}, format="json").status_code == 400


@pytest.mark.parametrize("path", ["news", "shop", "games"])
@pytest.mark.parametrize("payload", [["bad"], "bad", 1])
def test_delete_rejects_non_object_payloads(api, admin, path, payload):
    api.force_authenticate(admin)
    assert api.delete(f"/api/v1/staff/{path}/", payload, format="json").status_code == 400


def test_shop_dependencies_block_deletion_without_partial_changes(api, admin):
    api.force_authenticate(admin)
    item = ShopItem.objects.create(name="Item", item_id=57, price=1)
    pack = ShopPackage.objects.create(name="Pack", total_price=1)
    line = ShopPackageItem.objects.create(package=pack, item=item)
    assert api.delete("/api/v1/staff/shop/", {"id": str(item.id)}, format="json").status_code == 400
    assert ShopPackageItem.objects.filter(id=line.id).exists()
    cart = Cart.objects.create(user=admin)
    cartline = CartPackage.objects.create(cart=cart, package=pack)
    assert api.delete(f"/api/v1/staff/commerce/packages/{pack.id}/").status_code == 400
    assert CartPackage.objects.filter(id=cartline.id).exists()
    cartline.delete()
    assert api.delete(f"/api/v1/staff/commerce/packages/{pack.id}/").status_code == 200
    assert ShopItem.objects.filter(id=item.id).exists()
    cartitem = CartItem.objects.create(cart=cart, item=item)
    assert api.delete("/api/v1/staff/shop/", {"id": str(item.id)}, format="json").status_code == 400
    assert CartItem.objects.filter(id=cartitem.id).exists()


def test_purchase_snapshots_survive_catalog_deletion(api, admin):
    api.force_authenticate(admin)
    item = ShopItem.objects.create(name="Item", item_id=57, price=1)
    snapshot = [{"id": str(item.id), "name": "Item", "quantity": 1}]
    purchase = ShopPurchase.objects.create(user=admin, total=1, items_snapshot=snapshot)
    assert api.delete("/api/v1/staff/shop/", {"id": str(item.id)}, format="json").status_code == 200
    purchase.refresh_from_db()
    assert purchase.items_snapshot == snapshot


@pytest.mark.parametrize("used", ["counter", "purchase"])
def test_used_promo_cannot_be_deleted(api, admin, used):
    api.force_authenticate(admin)
    promo = PromotionCode.objects.create(code="USED", percent=10, uses=1 if used == "counter" else 0)
    if used == "purchase":
        ShopPurchase.objects.create(user=admin, total=1, promo_code=promo.code)
    assert api.delete(f"/api/v1/staff/commerce/promos/{promo.id}/").status_code == 400
    assert PromotionCode.objects.filter(id=promo.id).exists()


def test_game_content_preserves_configurations_and_player_history(api, admin):
    from django.utils import timezone
    api.force_authenticate(admin)
    season = BattlePassSeason.objects.create(name="Season", starts_at=timezone.now(), ends_at=timezone.now())
    level = BattlePassLevel.objects.create(season=season, level=1, required_xp=1)
    assert api.delete(f"/api/v1/staff/game-content/seasons/{season.id}/").status_code == 400
    assert BattlePassLevel.objects.filter(id=level.id).exists()
    prize = Prize.objects.create(name="Prize", item_id=57)
    spin = SpinHistory.objects.create(user=admin, prize=prize)
    assert api.delete(f"/api/v1/staff/game-content/prizes/{prize.id}/").status_code == 400
    assert SpinHistory.objects.filter(id=spin.id, prize=prize).exists()
    assert api.delete(f"/api/v1/staff/game-content/unknown/{uuid4()}/").status_code == 404


def test_inventory_dependency_and_translated_error(api, admin):
    from apps.games.infrastructure.models import FishingBait, UserFishingBait
    api.force_authenticate(admin)
    bait = FishingBait.objects.create(name="Bait", price=1)
    stock = UserFishingBait.objects.create(user=admin, bait=bait, quantity=3)
    response = api.delete(f"/api/v1/staff/game-content/baits/{bait.id}/", HTTP_ACCEPT_LANGUAGE="en")
    assert response.status_code == 400
    stock.refresh_from_db()
    assert stock.quantity == 3
    assert FishingBait.objects.filter(id=bait.id).exists()
    assert "linked" in str(response.data)


def test_custom_item_delete_permission_is_separate(api):
    from django.contrib.auth.models import Permission
    user = get_user_model().objects.create_user(username="metadata-editor", email="editor@example.invalid")
    user.user_permissions.add(*Permission.objects.filter(codename__in=("items_manage", "view_customcatalogitem", "change_customcatalogitem")))
    item = CustomCatalogItem.objects.create(item_id=999999, name="Custom", image="custom.png")
    api.force_authenticate(user)
    path = f"/api/v1/staff/custom-items/{item.id}/"
    assert api.delete(path).status_code == 403
    user.user_permissions.add(Permission.objects.get(codename="delete_customcatalogitem"))
    user = get_user_model().objects.get(id=user.id)
    api.force_authenticate(user)
    assert api.delete(path).status_code == 200


def test_database_protection_is_translated_without_partial_deletion(admin):
    from apps.games.infrastructure.models import FishingBait, UserFishingBait
    from common.architecture.exceptions import ValidationDomainError
    from common.persistence.deletion import delete_unreferenced
    bait = FishingBait.objects.create(name="Protected bait", price=1)
    stock = UserFishingBait.objects.create(user=admin, bait=bait, quantity=2)
    with pytest.raises(ValidationDomainError):
        delete_unreferenced(FishingBait, bait.id, owned_relations=("userfishingbait_set",))
    assert FishingBait.objects.filter(id=bait.id).exists()
    stock.refresh_from_db()
    assert stock.quantity == 2


def test_a_content_manager_can_delete_news_without_commerce_permissions(api):
    from django.contrib.auth.models import Permission
    user = get_user_model().objects.create_user(username="news-editor", email="news-editor@example.invalid")
    user.user_permissions.add(Permission.objects.get(codename="content_manage"))
    api.force_authenticate(user)
    news = News.objects.create(title="Draft", slug="draft-delete", body="Content", is_published=False)
    assert api.delete("/api/v1/staff/news/", {"id": str(news.id)}, format="json").status_code == 200
    item = ShopItem.objects.create(name="Keep", item_id=57, price=1)
    assert api.delete("/api/v1/staff/shop/", {"id": str(item.id)}, format="json").status_code == 403
    assert ShopItem.objects.filter(id=item.id).exists()


def test_unknown_commerce_section_cannot_delete_a_record(api, admin):
    api.force_authenticate(admin)
    promo = PromotionCode.objects.create(code="KEEPUNKNOWN", percent=10)
    assert api.delete(f"/api/v1/staff/commerce/unknown/{promo.id}/").status_code == 404
    assert PromotionCode.objects.filter(id=promo.id).exists()
