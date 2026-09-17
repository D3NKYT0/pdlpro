"""Corrida de lances: o segundo não estorna o anterior nem grava oferta fantasma."""

from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.auction.domain.exceptions import InvalidBidError
from apps.auction.infrastructure.models import Auction, Bid
from apps.auction.infrastructure.repositories import DjangoAuctionRepository
from apps.wallet.infrastructure.models import Wallet

pytestmark = pytest.mark.django_db


def test_place_bid_compare_and_set_rejects_stale_price():
    User = get_user_model()
    seller = User.objects.create_user(username="auc_s", email="auc_s@test.dev")
    first = User.objects.create_user(username="auc_b1", email="auc_b1@test.dev")
    second = User.objects.create_user(username="auc_b2", email="auc_b2@test.dev")
    auction = Auction.objects.create(
        seller=seller,
        item_id=57,
        item_name="Adena",
        quantity=1,
        min_bid=Decimal(10),
        character_name="SellerChar",
        ends_at=timezone.now() + timedelta(hours=1),
    )
    repo = DjangoAuctionRepository()

    first_bid = repo.place_bid(
        auction.id, first.id, Decimal(20), "b1Char", expected_current_bid=None
    )
    assert first_bid.amount == Decimal(20)

    with pytest.raises(InvalidBidError):
        repo.place_bid(auction.id, second.id, Decimal(25), "b2Char", expected_current_bid=None)

    second_bid = repo.place_bid(
        auction.id, second.id, Decimal(30), "b2Char", expected_current_bid=Decimal(20)
    )
    assert second_bid.amount == Decimal(30)
    auction.refresh_from_db()
    assert auction.current_bid == Decimal(30)
    assert auction.highest_bidder_id == second.pk
    assert Bid.objects.count() == 2


def test_mark_finished_compare_and_set_runs_once():
    User = get_user_model()
    seller = User.objects.create_user(username="auc_fin_s", email="auc_fin_s@test.dev")
    auction = Auction.objects.create(
        seller=seller,
        item_id=57,
        item_name="Adena",
        quantity=1,
        min_bid=Decimal(10),
        character_name="SellerChar",
        ends_at=timezone.now() - timedelta(seconds=1),
    )
    repo = DjangoAuctionRepository()
    first = repo.mark_finished(auction.id)
    assert first is not None
    assert first.status == "finished"
    assert repo.mark_finished(auction.id) is None
    auction.refresh_from_db()
    assert auction.status == Auction.Status.FINISHED


def test_sequential_outbid_does_not_double_refund():
    from rest_framework.test import APIClient

    User = get_user_model()
    seller = User.objects.create_user(username="auc_seq_s", email="auc_seq_s@test.dev")
    first = User.objects.create_user(username="auc_seq_b1", email="auc_seq_b1@test.dev")
    second = User.objects.create_user(username="auc_seq_b2", email="auc_seq_b2@test.dev")
    for user in (seller, first, second):
        Wallet.objects.create(user=user, balance=100)
    auction = Auction.objects.create(
        seller=seller,
        item_id=57,
        item_name="Adena",
        quantity=1,
        min_bid=Decimal(10),
        character_name="SellerChar",
        ends_at=timezone.now() + timedelta(hours=1),
    )

    def bid(user, amount):
        client = APIClient()
        client.force_authenticate(user)
        return client.post(
            f"/api/v1/customer/auctions/{auction.id}/bid/",
            {"amount": amount, "character_name": f"{user.username}Char"},
            format="json",
        )

    assert bid(first, "20").status_code == 200
    assert bid(second, "30").status_code == 200
    assert Wallet.objects.get(user=first).balance == Decimal(100)
    assert Wallet.objects.get(user=second).balance == Decimal(70)
    assert Wallet.objects.get(user=seller).balance == Decimal(100)
