import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def seller(db):
    return User.objects.create_user(username="seller", email="seller@pdl.dev", password="Secret123")


@pytest.fixture
def buyer(db):
    return User.objects.create_user(username="buyer", email="buyer@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_list_and_buy_character(api, seller, buyer):
    api.force_authenticate(user=seller)
    assert api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json").status_code == 200
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character("seller", "SirSell")

    listed = api.post(
        "/api/v1/customer/marketplace/",
        {"char_id": char.char_id, "price": "25.00"},
        format="json",
    )
    assert listed.status_code == 200, listed.data
    listing_id = listed.data["id"]
    catalog = api.get("/api/v1/public/marketplace/")
    assert catalog.status_code == 200
    assert catalog.data[0]["char_name"] == "SirSell"

    api.force_authenticate(user=buyer)
    assert api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json").status_code == 200
    order = api.post("/api/v1/customer/payments/", {"amount": "40.00", "method": "mock"}, format="json")
    api.post(f"/api/v1/customer/payments/{order.data['id']}/confirm/", format="json")
    bought = api.post(f"/api/v1/customer/marketplace/{listing_id}/buy/", format="json")
    assert bought.status_code == 200, bought.data
    assert bought.data["status"] == "sold"
    assert gateway.get_character("buyer", char.char_id) is not None
    wallet = api.get("/api/v1/shared/wallet/")
    assert wallet.data["balance"] == "15.00"
