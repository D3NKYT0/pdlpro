"""Valor personalizado: a equipe liga/desliga e limita em moedas; a API aplica a política."""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payment.infrastructure.models import PedidoPagamento
from apps.wallet.infrastructure.models import CoinConfig, CoinPackage

pytestmark = pytest.mark.django_db


@pytest.fixture
def api(settings):
    settings.PAYMENT_ALLOW_MOCK = True
    settings.PAYMENT_METHODS = ["mock"]
    CoinConfig.objects.create(name="Coin", coin_id=57, multiplier=1, active=True)
    client = APIClient()
    client.force_authenticate(get_user_model().objects.create_user(username="buyer", email="buyer@test.dev"))
    return client


def _order(api, **payload):
    return api.post("/api/v1/customer/payments/", {"method": "mock", "currency": "BRL", **payload}, format="json")


def test_catalog_exposes_the_policy(api, settings):
    settings.WALLET_CUSTOM_AMOUNT_ENABLED = False
    settings.WALLET_CUSTOM_AMOUNT_MIN_COINS = 5
    settings.WALLET_CUSTOM_AMOUNT_MAX_COINS = 500

    catalog = api.get("/api/v1/customer/payments/catalog/").data

    assert catalog["allow_custom_amount"] is False
    assert catalog["custom_amount"] == {"enabled": False, "min_coins": 5, "max_coins": 500}


def test_disabled_custom_amount_is_refused_but_packages_still_sell(api, settings):
    settings.WALLET_CUSTOM_AMOUNT_ENABLED = False
    package = CoinPackage.objects.create(code="p10", name="10", coins=10, price_brl=Decimal(10), price_usd=Decimal(2), active=True)

    assert _order(api, amount="10").status_code == 400
    assert not PedidoPagamento.objects.exists()
    assert _order(api, package_id=str(package.id)).status_code in (200, 201)


@pytest.mark.parametrize("amount,allowed", [("4", False), ("5", True), ("500", True), ("501", False)])
def test_custom_amount_limits_are_inclusive(api, settings, amount, allowed):
    settings.WALLET_CUSTOM_AMOUNT_MIN_COINS = 5
    settings.WALLET_CUSTOM_AMOUNT_MAX_COINS = 500

    response = _order(api, amount=amount)

    assert (response.status_code in (200, 201)) is allowed, response.data
    assert PedidoPagamento.objects.exists() is allowed


def test_zero_limits_mean_no_limit(api, settings):
    settings.WALLET_CUSTOM_AMOUNT_MIN_COINS = 0
    settings.WALLET_CUSTOM_AMOUNT_MAX_COINS = 0

    assert _order(api, amount="1").status_code in (200, 201)
    assert _order(api, amount="99999").status_code in (200, 201)
