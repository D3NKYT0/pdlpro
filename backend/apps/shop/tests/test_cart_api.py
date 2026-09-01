import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.shop.infrastructure.models import ShopItem


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="shopper",
        email="shopper@pdl.dev",
        password="Secret123",
    )


@pytest.fixture
def item(db):
    return ShopItem.objects.create(name="Adena", item_id=57, price="1.00", quantity=1000)


@pytest.mark.django_db
def test_cart_add_list_update_and_remove(api, user, item):
    api.force_authenticate(user=user)

    added = api.post("/api/v1/shared/shop/cart/", {"item_id": str(item.id), "quantity": 2}, format="json")
    assert added.status_code == 200, added.data
    assert added.data["count"] == 2
    assert added.data["total"] == "2.00"
    assert added.data["items"][0]["grant_quantity"] == 1000

    listed = api.get("/api/v1/shared/shop/cart/")
    assert listed.status_code == 200
    cart_item_id = listed.data["items"][0]["id"]

    updated = api.patch(f"/api/v1/shared/shop/cart/{cart_item_id}/", {"quantity": 3}, format="json")
    assert updated.status_code == 200, updated.data
    assert updated.data["count"] == 3
    assert updated.data["total"] == "3.00"

    removed = api.delete(f"/api/v1/shared/shop/cart/{cart_item_id}/")
    assert removed.status_code == 200
    assert removed.data == {"items": [], "count": 0, "total": "0.00"}


@pytest.mark.django_db
def test_cart_is_private(api, item):
    response = api.get("/api/v1/shared/shop/cart/")
    assert response.status_code == 401
