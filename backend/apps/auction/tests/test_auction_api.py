from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.auction.infrastructure.models import Auction
from apps.server.domain.gateways import GameItem, ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from common.di.bootstrap import DependencyInjection

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def seller(db):
    return User.objects.create_user(username="aseller", email="aseller@pdl.dev", password="Secret123")


@pytest.fixture
def bidder(db):
    return User.objects.create_user(username="abidder", email="abidder@pdl.dev", password="Secret123")


@pytest.mark.django_db
def test_create_bid_and_close_auction(api, seller, bidder):
    api.force_authenticate(user=seller)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character("aseller", "SirAuc", items=[GameItem(57, "Adena", 200, 0)])
    withdrawn = api.post(
        "/api/v1/customer/inventory/withdraw/",
        {"char_id": char.char_id, "item_id": 57, "quantity": 50},
        format="json",
    )
    assert withdrawn.status_code == 200, withdrawn.data
    dashboard = api.get("/api/v1/customer/inventory/")
    inventory_id = dashboard.data[0]["inventory_id"]
    created = api.post(
        "/api/v1/customer/auctions/",
        {
            "inventory_id": inventory_id,
            "item_id": 57,
            "quantity": 20,
            "enchant": 0,
            "min_bid": "10.00",
            "hours": 24,
        },
        format="json",
    )
    assert created.status_code == 200, created.data
    assert created.data["item_name"] == "Adena"
    assert created.data["quantity"] == 20
    assert created.data["item_enchant"] == 0
    assert created.data["created_at"]
    auction_id = created.data["id"]

    api.force_authenticate(user=bidder)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass1"}, format="json")
    gateway.seed_character("abidder", "SirBid")
    order = api.post("/api/v1/customer/payments/", {"amount": "30.00", "method": "mock"}, format="json")
    api.post(f"/api/v1/customer/payments/{order.data['id']}/confirm/", format="json")
    bid = api.post(
        f"/api/v1/customer/auctions/{auction_id}/bid/",
        {"amount": "15.00", "character_name": "SirBid"},
        format="json",
    )
    assert bid.status_code == 200, bid.data
    Auction.objects.filter(id=auction_id).update(ends_at=timezone.now() - timedelta(minutes=1))
    listed = api.get("/api/v1/public/auctions/")
    assert listed.status_code == 200
    assert listed.data == []
    api.force_authenticate(user=bidder)
    inv = api.get("/api/v1/customer/inventory/")
    items = inv.data[0]["items"] if inv.data else []
    assert any(item["item_id"] == 57 and item["quantity"] == 20 for item in items)
