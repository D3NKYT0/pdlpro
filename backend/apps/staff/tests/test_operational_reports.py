from datetime import datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.auction.infrastructure.models import Auction, Bid
from apps.inventory.infrastructure.models import InventoryLog
from apps.marketplace.infrastructure.models import CharacterListing
from apps.shop.infrastructure.models import Cart, CartItem, ShopItem, ShopPurchase

pytestmark = pytest.mark.django_db
BASE = "/api/v1/staff/operational-reports/"
REPORTS = ("inventory", "auctions", "purchases", "marketplace")


def user(name, **kwargs):
    return get_user_model().objects.create_user(username=name, email=f"{name}@pdl.test", **kwargs)


@pytest.fixture
def staff_client():
    client = APIClient()
    client.force_authenticate(user("gm", is_staff=True))
    return client


@pytest.mark.parametrize("report", REPORTS)
def test_operational_reports_require_staff(report):
    client = APIClient()
    assert client.get(f"{BASE}{report}/").status_code in (401, 403)
    client.force_authenticate(user("player"))
    assert client.get(f"{BASE}{report}/").status_code == 403


@pytest.mark.parametrize("report", REPORTS)
def test_empty_operational_reports_are_read_only(staff_client, report):
    response = staff_client.get(f"{BASE}{report}/", {"username": "nobody"})
    assert response.status_code == 200, response.data
    assert response.data["results"] == []
    assert response.data["count"] == 0
    assert response.data["total_pages"] == 1
    assert response["Cache-Control"] == "no-store"
    assert staff_client.post(f"{BASE}{report}/", {}).status_code == 405


def test_inventory_aggregates_actions_and_tops(staff_client):
    alice = user("alice")
    bob = user("bob")
    InventoryLog.objects.create(
        user=alice, action="RETIROU_DO_JOGO", item_id=57, item_name="Adena", quantity=100
    )
    InventoryLog.objects.create(
        user=alice, action="INSERIU_NO_JOGO", item_id=57, item_name="Adena", quantity=40
    )
    InventoryLog.objects.create(
        user=bob, action="TROCA_ENTRE_PERSONAGENS", item_id=4037, item_name="Coin", quantity=2
    )
    response = staff_client.get(f"{BASE}inventory/").json()
    assert response["summary"]["log_count"] == 3
    assert response["summary"]["unique_users"] == 2
    assert response["summary"]["actions"]["RETIROU_DO_JOGO"]["quantity"] == 100
    assert response["summary"]["top_items"][0]["item_name"] == "Adena"
    assert response["summary"]["top_users"][0]["username"] == "alice"
    assert response["count"] >= 1
    filtered = staff_client.get(f"{BASE}inventory/", {"action": "TROCA_ENTRE_PERSONAGENS"}).json()
    assert filtered["summary"]["log_count"] == 1
    assert filtered["summary"]["unique_users"] == 1


def test_auctions_status_and_bid_tops(staff_client):
    seller = user("seller")
    bidder = user("bidder")
    open_auction = Auction.objects.create(
        seller=seller,
        item_id=1,
        item_name="Sword",
        min_bid=Decimal("10.00"),
        ends_at=timezone.now() + timedelta(days=1),
        status=Auction.Status.OPEN,
    )
    finished = Auction.objects.create(
        seller=seller,
        item_id=2,
        item_name="Bow",
        min_bid=Decimal("5.00"),
        current_bid=Decimal("20.00"),
        highest_bidder=bidder,
        ends_at=timezone.now() - timedelta(hours=1),
        status=Auction.Status.FINISHED,
    )
    Bid.objects.create(auction=open_auction, bidder=bidder, amount=Decimal("12.00"), character_name="Hero")
    Bid.objects.create(auction=open_auction, bidder=bidder, amount=Decimal("15.00"), character_name="Hero")
    Bid.objects.create(auction=finished, bidder=bidder, amount=Decimal("20.00"), character_name="Hero")
    response = staff_client.get(f"{BASE}auctions/").json()
    assert response["count"] == 2
    assert response["summary"]["open_count"] == 1
    assert response["summary"]["finished_count"] == 1
    assert response["summary"]["bid_count"] == 3
    assert response["summary"]["top_by_bids"][0]["item_name"] == "Sword"
    assert response["summary"]["top_by_bids"][0]["bid_count"] == 2
    filtered = staff_client.get(f"{BASE}auctions/", {"status": "finished"}).json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["item_name"] == "Bow"


def test_purchases_revenue_tops_and_abandoned_carts(staff_client):
    buyer = user("buyer")
    idle = user("idle")
    ShopPurchase.objects.create(
        user=buyer,
        total=Decimal("50.00"),
        subtotal=Decimal("60.00"),
        discount=Decimal("10.00"),
        status="completed",
        promo_code="SAVE10",
        items_snapshot=[
            {"kind": "item", "name": "Scroll", "quantity": 3},
            {"kind": "package", "name": "Starter", "quantity": 1},
        ],
    )
    ShopPurchase.objects.create(user=buyer, total=Decimal("5.00"), status="cancelled")
    item = ShopItem.objects.create(name="Potion", item_id=1001, price=Decimal("1.00"))
    cart = Cart.objects.create(user=idle)
    CartItem.objects.create(cart=cart, item=item, quantity=2)
    response = staff_client.get(f"{BASE}purchases/").json()
    assert response["count"] == 2
    assert response["summary"]["completed_count"] == 1
    assert response["summary"]["revenue"] == "50.00"
    assert response["summary"]["discount_total"] == "10.00"
    assert response["summary"]["abandoned_carts"] == 1
    assert response["summary"]["top_items"][0]["name"] == "Scroll"
    assert response["summary"]["top_packages"][0]["name"] == "Starter"
    assert response["summary"]["top_promos"][0] == {"code": "SAVE10", "uses": 1}


def test_marketplace_sales_and_sellers(staff_client):
    seller = user("seller")
    buyer = user("buyer")
    CharacterListing.objects.create(
        seller=seller,
        buyer=buyer,
        char_id=10,
        char_name="Hero",
        price=Decimal("100.00"),
        status=CharacterListing.Status.SOLD,
        sold_at=timezone.now(),
    )
    CharacterListing.objects.create(
        seller=seller,
        char_id=11,
        char_name="Alt",
        price=Decimal("40.00"),
        status=CharacterListing.Status.FOR_SALE,
    )
    CharacterListing.objects.create(
        seller=seller,
        char_id=12,
        char_name="Old",
        price=Decimal("10.00"),
        status=CharacterListing.Status.CANCELLED,
    )
    response = staff_client.get(f"{BASE}marketplace/").json()
    assert response["count"] == 3
    assert response["summary"]["sold_count"] == 1
    assert response["summary"]["for_sale_count"] == 1
    assert response["summary"]["sold_revenue"] == "100.00"
    assert response["summary"]["top_sellers"][0]["username"] == "seller"
    assert response["summary"]["top_sellers"][0]["sales"] == 1
    filtered = staff_client.get(f"{BASE}marketplace/", {"status": "for_sale"}).json()
    assert filtered["count"] == 1
    assert filtered["results"][0]["char_name"] == "Alt"


@pytest.mark.parametrize(
    "report,filters",
    [
        ("inventory", {"date_from": "bad-date"}),
        ("inventory", {"date_from": "2026-09-02", "date_to": "2026-09-01"}),
        ("inventory", {"action": "UNKNOWN"}),
        ("auctions", {"status": "pending"}),
        ("marketplace", {"status": "open"}),
        ("purchases", {"page": "0"}),
        ("purchases", {"page_size": "51"}),
    ],
)
def test_operational_invalid_filters(staff_client, report, filters):
    response = staff_client.get(f"{BASE}{report}/", filters)
    assert response.status_code == 400


def test_operational_page_out_of_range(staff_client):
    assert staff_client.get(f"{BASE}inventory/", {"page": 999}).status_code == 404
