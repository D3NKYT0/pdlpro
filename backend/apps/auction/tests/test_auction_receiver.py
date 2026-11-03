"""VST-01/02/03: lances só entregam em contas e personagens do participante; lance não fica preso."""

from datetime import timedelta
from decimal import Decimal

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient

from apps.auction.application.use_cases import CloseExpiredAuctionsUseCase
from apps.auction.infrastructure.models import Auction, Bid
from apps.auction.tests.helpers import link_player
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.infrastructure.models import Wallet
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db
User = get_user_model()


@pytest.fixture
def people():
    seller = User.objects.create_user(username="seller", email="s@pdl.dev")
    bidder = User.objects.create_user(username="bidder", email="b@pdl.dev")
    stranger = User.objects.create_user(username="stranger", email="x@pdl.dev")
    for user in (seller, bidder):
        Wallet.objects.create(user=user, balance=Decimal(100))
    link_player(seller, "SellerChar")
    link_player(bidder, "BidderChar")
    link_player(stranger, "StrangerChar")
    return seller, bidder, stranger


def _bid(user, auction, **payload):
    client = APIClient()
    client.force_authenticate(user)
    return client.post(f"/api/v1/customer/auctions/{auction.id}/bid/", {"amount": "20", **payload}, format="json")


def _gateway():
    return DependencyInjection.root().resolve(ILineageGateway)


def _character_auction(seller, *, ends_in=timedelta(hours=1)):
    master = settings.MARKETPLACE_MASTER_ACCOUNT
    char = _gateway().seed_character(master, "Auctioned")
    return Auction.objects.create(
        seller=seller, kind="character", item_name=char.name, quantity=1, min_bid=10,
        character_name=char.name, char_id=char.char_id, char_name=char.name, old_account="seller",
        ends_at=timezone.now() + ends_in,
    )


def _close():
    return DependencyInjection.root().create_scope().resolve(CloseExpiredAuctionsUseCase).execute()


def _expire(auction):
    Auction.objects.filter(id=auction.id).update(ends_at=timezone.now() - timedelta(seconds=1))


def test_item_bid_refuses_a_character_of_another_player(people):
    seller, bidder, _ = people
    auction = Auction.objects.create(
        seller=seller, item_id=57, item_name="Adena", quantity=1, min_bid=10, character_name="SellerChar",
        ends_at=timezone.now() + timedelta(hours=1),
    )

    assert _bid(bidder, auction, character_name="StrangerChar").status_code == 400
    assert _bid(bidder, auction, character_name="StrangerChar", login="stranger").status_code == 400
    assert not Bid.objects.exists()
    assert _bid(bidder, auction, character_name="BidderChar").status_code == 200


def test_character_bid_refuses_an_account_the_bidder_does_not_own(people):
    seller, bidder, _ = people
    auction = _character_auction(seller)

    assert _bid(bidder, auction, login="stranger").status_code == 400
    assert Wallet.objects.get(user=bidder).balance == 100


def test_character_is_delivered_to_the_chosen_account_after_revalidation(people):
    seller, bidder, _ = people
    auction = _character_auction(seller)
    assert _bid(bidder, auction, login="bidder").status_code == 200
    _expire(auction)

    _close()

    assert "Auctioned" in [char.name for char in _gateway().list_characters("bidder")]
    assert Wallet.objects.get(user=seller).balance == 120


def test_unlinked_winner_gets_the_bid_back_and_the_seller_the_character(people):
    seller, bidder, _ = people
    auction = _character_auction(seller)
    assert _bid(bidder, auction, login="bidder").status_code == 200
    _gateway().clear_account_link("bidder")
    _expire(auction)

    _close()

    assert Wallet.objects.get(user=bidder).balance == 100
    assert Wallet.objects.get(user=seller).balance == 100
    assert "Auctioned" in [char.name for char in _gateway().list_characters("seller")]


def test_character_out_of_custody_never_keeps_the_winning_bid(people):
    seller, bidder, _ = people
    auction = _character_auction(seller)
    assert _bid(bidder, auction, login="bidder").status_code == 200
    _gateway().transfer_character(auction.char_id, "elsewhere", from_account=settings.MARKETPLACE_MASTER_ACCOUNT)
    _expire(auction)

    _close()

    assert Wallet.objects.get(user=bidder).balance == 100
    auction.refresh_from_db()
    assert auction.status == "finished"
