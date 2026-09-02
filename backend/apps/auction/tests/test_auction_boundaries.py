"""Leilões: restituição de lances, expiração e preservação de itens/saldos."""
from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.auction.application.use_cases import CloseExpiredAuctionsUseCase
from apps.auction.infrastructure.models import Auction, Bid
from apps.inventory.infrastructure.models import Inventory, InventoryItem
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db


@pytest.fixture
def world():
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("seller", "bidder", "rival")]
    for user in users:
        Wallet.objects.create(user=user, balance=100)
    auction = Auction.objects.create(seller=users[0], item_id=57, item_name="Adena", quantity=20, min_bid=10, character_name="SellerChar", ends_at=timezone.now() + timedelta(hours=1))
    return users, auction


def bid(user, auction, amount):
    client = APIClient()
    client.force_authenticate(user)
    return client.post(f"/api/v1/customer/auctions/{auction.id}/bid/", {"amount": amount, "character_name": f"{user.username}Char"}, format="json")


@pytest.mark.parametrize("amount", ["0", "-1", "9.99", "10", "100.01"])
def test_invalid_bid_does_not_debit(world, amount):
    users, auction = world
    assert bid(users[1], auction, amount).status_code == 400
    assert not Bid.objects.exists()
    assert not WalletTransaction.objects.exists()
    assert Wallet.objects.get(user=users[1]).balance == 100


def test_seller_cannot_bid_own_auction(world):
    users, auction = world
    assert bid(users[0], auction, "20").status_code == 400
    assert not Bid.objects.exists()


@pytest.mark.parametrize("status,expired", [("finished", False), ("cancelled", False), ("open", True)])
def test_inactive_auction_rejects_bid(world, status, expired):
    users, auction = world
    auction.status = status
    if expired:
        auction.ends_at = timezone.now() - timedelta(seconds=1)
    auction.save()
    assert bid(users[1], auction, "20").status_code == 400
    assert not WalletTransaction.objects.exists()


def test_outbid_refunds_previous_participant_and_closing_runs_once(world):
    users, auction = world
    assert bid(users[1], auction, "20").status_code == 200
    assert bid(users[2], auction, "30").status_code == 200
    assert Wallet.objects.get(user=users[1]).balance == 100
    assert Wallet.objects.get(user=users[2]).balance == 70
    assert bid(users[1], auction, "30").status_code == 400
    Auction.objects.filter(id=auction.id).update(ends_at=timezone.now() - timedelta(seconds=1))
    close = DependencyInjection.root().create_scope().resolve(CloseExpiredAuctionsUseCase)
    assert close.execute() == {"closed": 1}
    assert close.execute() == {"closed": 0}
    assert Wallet.objects.get(user=users[0]).balance == 130
    assert sum(Wallet.objects.values_list("balance", flat=True)) == Decimal("300")
    assert InventoryItem.objects.get(inventory__user=users[2], item_id=57).quantity == 20
    assert not InventoryItem.objects.filter(inventory__user=users[1]).exists()


def test_unsold_auction_returns_items_once(world):
    users, auction = world
    Auction.objects.filter(id=auction.id).update(ends_at=timezone.now() - timedelta(seconds=1))
    close = DependencyInjection.root().create_scope().resolve(CloseExpiredAuctionsUseCase)
    assert close.execute() == {"closed": 1}
    assert close.execute() == {"closed": 0}
    assert InventoryItem.objects.get(inventory__user=users[0], item_id=57).quantity == 20
    assert not WalletTransaction.objects.exists()


@pytest.mark.parametrize("overrides", [{"hours": 0}, {"hours": 169}, {"quantity": 0}, {"min_bid": "0"}, {"quantity": 21}])
def test_invalid_listing_keeps_inventory(world, overrides):
    users, _ = world
    inventory = Inventory.objects.create(user=users[0], character_name="SellerChar")
    item = InventoryItem.objects.create(inventory=inventory, item_id=57, item_name="Adena", quantity=20)
    client = APIClient()
    client.force_authenticate(users[0])
    response = client.post("/api/v1/customer/auctions/", {"inventory_id": str(inventory.id), "item_id": 57, "quantity": 1, "enchant": 0, "min_bid": "10", "hours": 24, **overrides}, format="json")
    assert response.status_code == 400, response.data
    item.refresh_from_db()
    assert item.quantity == 20
    assert Auction.objects.count() == 1
