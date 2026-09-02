"""Compra e cancelamento preservam custódia e não movimentam saldo duas vezes."""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.marketplace.infrastructure.models import CharacterListing
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db


@pytest.fixture
def market(settings):
    users = [get_user_model().objects.create_user(username=name, email=f"{name}@test.dev") for name in ("seller", "buyer")]
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    gateway.seed_character("buyer", "Existing")
    char = gateway.seed_character(settings.MARKETPLACE_MASTER_ACCOUNT, "ForSale")
    listing = CharacterListing.objects.create(seller=users[0], char_id=char.char_id, char_name=char.name, price=25, old_account="seller")
    Wallet.objects.create(user=users[1], balance=40)
    return users, listing, gateway


def call(user, listing, action):
    client = APIClient()
    client.force_authenticate(user)
    return client.post(f"/api/v1/customer/marketplace/{listing.id}/{action}/")


def test_cannot_buy_own_listing(market):
    users, listing, _ = market
    assert call(users[0], listing, "buy").status_code == 400
    assert not WalletTransaction.objects.exists()


def test_cancel_is_owner_only_and_restores_character(market):
    users, listing, gateway = market
    assert call(users[1], listing, "cancel").status_code == 403
    assert call(users[0], listing, "cancel").status_code == 200
    assert gateway.get_character("seller", listing.char_id) is not None
    assert call(users[0], listing, "cancel").status_code == 400
    assert call(users[1], listing, "buy").status_code == 400
    assert not WalletTransaction.objects.exists()


def test_purchase_repetition_never_charges_twice(market):
    users, listing, gateway = market
    assert call(users[1], listing, "buy").status_code == 200
    assert call(users[1], listing, "buy").status_code == 400
    assert Wallet.objects.get(user=users[1]).balance == 15
    assert Wallet.objects.get(user=users[0]).balance == 25
    assert WalletTransaction.objects.count() == 2
    assert gateway.get_character("buyer", listing.char_id) is not None


@pytest.mark.parametrize("reason", ["balance", "slots", "custody"])
def test_unavailable_purchase_preserves_money_and_listing(market, settings, reason):
    users, listing, gateway = market
    if reason == "balance":
        Wallet.objects.filter(user=users[1]).update(balance=24)
    elif reason == "slots":
        settings.MAX_CHARACTERS_PER_ACCOUNT = 1
    else:
        gateway.transfer_character(listing.char_id, "elsewhere")
    assert call(users[1], listing, "buy").status_code == 400
    listing.refresh_from_db()
    assert listing.status == "for_sale"
    assert Wallet.objects.get(user=users[1]).balance == (24 if reason == "balance" else 40)
    assert not WalletTransaction.objects.exists()
