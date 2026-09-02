"""Repetição, estados e isolamento de pedidos de pagamento."""
from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payment.application.pricing import CoinPricingService
from apps.payment.infrastructure.models import PedidoPagamento
from apps.wallet.infrastructure.models import CoinConfig, CoinPackage, Wallet, WalletTransaction
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError

pytestmark = pytest.mark.django_db


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(username="paymentowner", email="owner@test.dev")


@pytest.fixture
def api(owner):
    client = APIClient()
    client.force_authenticate(owner)
    return client


@pytest.fixture
def order(owner):
    return PedidoPagamento.objects.create(user=owner, amount=20, coins=20, currency="BRL", method="mock", status="pending")


def test_confirmation_repeated_does_not_credit_twice(api, order):
    for _ in range(3):
        response = api.post(f"/api/v1/customer/payments/{order.id}/confirm/")
        assert response.status_code == 200, response.data
    assert Wallet.objects.get(user=order.user).balance == 20
    assert WalletTransaction.objects.filter(wallet__user=order.user, kind="ENTRADA").count() == 1


def test_identical_pending_requests_reuse_order(api):
    responses = [api.post("/api/v1/customer/payments/", {"amount": "12.34", "method": "mock"}, format="json") for _ in range(2)]
    assert [response.status_code for response in responses] == [200, 200]
    assert responses[0].data["id"] == responses[1].data["id"]
    assert PedidoPagamento.objects.count() == 1


@pytest.mark.parametrize("action,method", [("confirm", "post"), ("cancel", "post"), ("status", "get"), ("process", "post")])
def test_foreign_order_cannot_be_used(api, order, action, method):
    stranger = get_user_model().objects.create_user(username="stranger", email="stranger@test.dev")
    api.force_authenticate(stranger)
    response = getattr(api, method)(f"/api/v1/customer/payments/{order.id}/{action}/", {}, format="json")
    assert response.status_code == 403, response.data
    order.refresh_from_db()
    assert order.status == "pending"
    assert not WalletTransaction.objects.exists()


@pytest.mark.parametrize("action,method", [("confirm", "post"), ("cancel", "post"), ("status", "get"), ("process", "post")])
def test_missing_order_returns_not_found(api, action, method):
    assert getattr(api, method)(f"/api/v1/customer/payments/{uuid4()}/{action}/", {}, format="json").status_code == 404


@pytest.mark.parametrize("status", ["cancelled", "failed"])
def test_terminal_order_cannot_be_confirmed(api, order, status):
    order.status = status
    order.save()
    assert api.post(f"/api/v1/customer/payments/{order.id}/confirm/").status_code == 400
    assert not WalletTransaction.objects.exists()


@pytest.mark.parametrize("status", ["pending", "processing"])
def test_cancel_pending_order_prevents_future_confirmation(api, order, status):
    order.status = status
    order.save()
    response = api.post(f"/api/v1/customer/payments/{order.id}/cancel/")
    assert response.status_code == 200
    assert response.data["status"] == "cancelled"
    assert api.post(f"/api/v1/customer/payments/{order.id}/confirm/").status_code == 400
    assert not WalletTransaction.objects.exists()


def test_mock_cannot_be_used_when_disabled(api, order, settings):
    settings.PAYMENT_ALLOW_MOCK = False
    assert api.post(f"/api/v1/customer/payments/{order.id}/confirm/").status_code == 400
    response = api.post("/api/v1/customer/payments/", {"amount": "20", "method": "mock"}, format="json")
    assert response.status_code == 400
    assert not WalletTransaction.objects.exists()


@pytest.mark.parametrize("amount", [None, Decimal("0"), Decimal("-1")])
def test_quote_rejects_nonpositive_amount(amount):
    with pytest.raises(ValidationDomainError):
        CoinPricingService().quote(package_id=None, amount=amount, currency="BRL")


@pytest.mark.parametrize("currency", ["EUR", "", "BTC"])
def test_quote_rejects_unsupported_currency(currency):
    with pytest.raises(ValidationDomainError):
        CoinPricingService().quote(package_id=None, amount=Decimal("10"), currency=currency)


@pytest.mark.parametrize("by_code", [False, True])
@pytest.mark.parametrize("currency,price", [("BRL", "30.00"), ("usd", "7.00")])
def test_package_lookup_by_uuid_or_code_overrides_custom_amount(by_code, currency, price):
    package = CoinPackage.objects.create(code="test-code", name="Teste", coins=50, price_brl=30, price_usd=7)
    quote = CoinPricingService().quote(package_id=package.code if by_code else str(package.id), amount=Decimal("999"), currency=currency)
    assert quote.amount == Decimal(price)
    assert quote.coins == 50
    assert quote.currency == currency.upper()


@pytest.mark.parametrize("identifier", ["nonexistent-code", str(uuid4())])
def test_missing_package_is_domain_not_found(identifier):
    with pytest.raises(EntityNotFoundError):
        CoinPricingService().quote(package_id=identifier, amount=None, currency="BRL")


def test_inactive_package_is_not_for_sale():
    package = CoinPackage.objects.create(code="inactive", name="Inativo", coins=50, price_brl=30, price_usd=7, active=False)
    with pytest.raises(EntityNotFoundError):
        CoinPricingService().quote(package_id=str(package.id), amount=None, currency="BRL")


@pytest.mark.parametrize("currency,expected", [("BRL", "25.02"), ("USD", "60.06")])
def test_quote_uses_active_exchange_rate_and_decimal_rounding(currency, expected):
    CoinConfig.objects.create(name="Teste", multiplier="2.50", usd_multiplier="6")
    quote = CoinPricingService().quote(package_id=None, amount=Decimal("10.01"), currency=currency)
    # Decimal usa ROUND_HALF_EVEN: 25.025 arredonda para 25.02.
    assert quote.coins == Decimal(expected)
