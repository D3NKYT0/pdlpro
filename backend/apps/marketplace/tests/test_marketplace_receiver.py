"""VST-01: o personagem comprado só vai para uma conta de jogo vinculada ao comprador."""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.marketplace.infrastructure.models import CharacterListing
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db
User = get_user_model()


def _client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


@pytest.fixture
def scenario(settings):
    seller = User.objects.create_user(username="seller", email="s@pdl.dev", password="Secret123")
    victim = User.objects.create_user(username="victim", email="v@pdl.dev", password="Secret123")
    attacker = User.objects.create_user(username="attacker", email="a@pdl.dev", password="Secret123")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    char = gateway.seed_character(settings.MARKETPLACE_MASTER_ACCOUNT, "Prize")
    listing = CharacterListing.objects.create(
        seller=seller, char_id=char.char_id, char_name=char.name, price=25, old_account="seller"
    )
    Wallet.objects.create(user=victim, balance=Decimal(100))
    assert _client(victim).post(
        "/api/v1/customer/server/accounts/register/", {"password": "l2pass123", "login": "victimmain"}, format="json"
    ).status_code == 200
    # O atacante registra para si o login igual ao nome de usuário da vítima.
    assert _client(attacker).post(
        "/api/v1/customer/server/accounts/register/", {"password": "l2pass123", "login": "victim"}, format="json"
    ).status_code == 200
    return {"victim": victim, "listing": listing, "gateway": gateway, "char": char}


def _buy(scenario, payload=None):
    return _client(scenario["victim"]).post(
        f"/api/v1/customer/marketplace/{scenario['listing'].id}/buy/", payload or {}, format="json"
    )


def test_purchase_never_delivers_to_an_account_named_after_the_buyer_but_owned_by_someone_else(scenario):
    response = _buy(scenario)

    assert response.status_code == 400
    assert scenario["gateway"].list_characters("victim") == []
    assert Wallet.objects.get(user=scenario["victim"]).balance == 100
    assert not WalletTransaction.objects.exists()


@pytest.mark.parametrize("login", ["victim", "ghostaccount"])
def test_purchase_refuses_an_explicit_account_the_buyer_does_not_own(scenario, login):
    assert _buy(scenario, {"login": login}).status_code == 400
    assert Wallet.objects.get(user=scenario["victim"]).balance == 100


def test_purchase_delivers_to_the_chosen_linked_account(scenario):
    response = _buy(scenario, {"login": "victimmain"})

    assert response.status_code == 200, response.data
    assert [char.name for char in scenario["gateway"].list_characters("victimmain")] == ["Prize"]
    assert Wallet.objects.get(user=scenario["victim"]).balance == 75
