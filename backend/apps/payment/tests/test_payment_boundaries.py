"""Repetição, estados e isolamento de pedidos de pagamento."""
from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payment.application.pricing import CoinPricingService
from apps.payment.application.use_cases import (
    ApplyGatewayPaymentInput,
    ApplyGatewayPaymentUseCase,
)
from apps.payment.infrastructure.models import PedidoPagamento
from apps.payment.tests.helpers import confirm_mock_payment
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.models import (
    CoinConfig,
    CoinPackage,
    Wallet,
    WalletTransaction,
)
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError
from common.di.bootstrap import DependencyInjection

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


def test_player_cannot_confirm_own_mock_order(api, order):
    response = api.post(f"/api/v1/customer/payments/{order.id}/confirm/")
    assert response.status_code == 403, response.data
    order.refresh_from_db()
    assert order.status == "pending"
    assert not WalletTransaction.objects.exists()


def test_player_cannot_process_own_mock_order(api, order):
    response = api.post(f"/api/v1/customer/payments/{order.id}/process/", {}, format="json")
    assert response.status_code == 400, response.data
    order.refresh_from_db()
    assert order.status == "pending"
    assert not WalletTransaction.objects.exists()


def test_confirmation_repeated_does_not_credit_twice(order):
    for _ in range(3):
        response = confirm_mock_payment(order.id)
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


@pytest.mark.parametrize("action,method", [("cancel", "post"), ("status", "get"), ("process", "post")])
def test_missing_order_returns_not_found(api, action, method):
    assert getattr(api, method)(f"/api/v1/customer/payments/{uuid4()}/{action}/", {}, format="json").status_code == 404


def test_player_confirm_is_forbidden_even_when_order_is_missing(api):
    assert api.post(f"/api/v1/customer/payments/{uuid4()}/confirm/", {}, format="json").status_code == 403


@pytest.mark.parametrize("status", ["cancelled", "failed"])
def test_terminal_order_cannot_be_confirmed(order, status):
    order.status = status
    order.save()
    assert confirm_mock_payment(order.id).status_code == 400
    assert not WalletTransaction.objects.exists()


@pytest.mark.parametrize("status", ["pending", "processing"])
def test_cancel_pending_order_prevents_future_confirmation(api, order, status):
    order.status = status
    order.save()
    response = api.post(f"/api/v1/customer/payments/{order.id}/cancel/")
    assert response.status_code == 200
    assert response.data["status"] == "cancelled"
    assert confirm_mock_payment(order.id).status_code == 400
    assert not WalletTransaction.objects.exists()


def test_mock_cannot_be_used_when_disabled(api, order, settings):
    settings.PAYMENT_ALLOW_MOCK = False
    assert api.post(f"/api/v1/customer/payments/{order.id}/confirm/").status_code == 403
    response = api.post("/api/v1/customer/payments/", {"amount": "20", "method": "mock"}, format="json")
    assert response.status_code == 400
    assert not WalletTransaction.objects.exists()


def _apply_gateway_payment() -> ApplyGatewayPaymentUseCase:
    return DependencyInjection.root().create_scope().resolve(ApplyGatewayPaymentUseCase)


def test_webhook_settles_the_order_that_owns_the_external_id(owner):
    order = PedidoPagamento.objects.create(
        user=owner, amount=50, coins=50, currency="BRL", method="mercadopago",
        status="processing", external_id="mp-500",
    )

    settled = _apply_gateway_payment().execute(
        ApplyGatewayPaymentInput(external_id="mp-500", order_id=order.id, approved=True)
    )

    assert settled is not None
    order.refresh_from_db()
    assert order.status == "confirmed"
    assert Wallet.objects.get(user=owner).balance == 50


def test_webhook_metadata_cannot_point_a_cheap_payment_at_another_order(owner):
    paid = PedidoPagamento.objects.create(
        user=owner, amount=5, coins=5, currency="BRL", method="mercadopago",
        status="processing", external_id="mp-cheap",
    )
    expensive = PedidoPagamento.objects.create(
        user=owner, amount=500, coins=500, currency="BRL", method="mercadopago",
        status="processing", external_id="mp-expensive",
    )

    result = _apply_gateway_payment().execute(
        ApplyGatewayPaymentInput(external_id="mp-cheap", order_id=expensive.id, approved=True)
    )

    assert result is None
    expensive.refresh_from_db()
    paid.refresh_from_db()
    assert expensive.status == "processing"
    assert paid.status == "processing"
    assert not WalletTransaction.objects.exists()


def test_webhook_still_settles_when_the_order_has_no_external_id_yet(owner):
    order = PedidoPagamento.objects.create(
        user=owner, amount=30, coins=30, currency="BRL", method="mercadopago",
        status="processing", external_id="",
    )

    settled = _apply_gateway_payment().execute(
        ApplyGatewayPaymentInput(external_id="mp-inflight", order_id=order.id, approved=True)
    )

    assert settled is not None
    order.refresh_from_db()
    assert order.status == "confirmed"
    assert Wallet.objects.get(user=owner).balance == 30


def _pricing() -> CoinPricingService:
    return CoinPricingService(DependencyInjection.root().create_scope().resolve(IWalletRepository))


@pytest.mark.parametrize("amount", [None, Decimal(0), Decimal(-1)])
def test_quote_rejects_nonpositive_amount(amount):
    with pytest.raises(ValidationDomainError):
        _pricing().quote(package_id=None, amount=amount, currency="BRL")


@pytest.mark.parametrize("currency", ["EUR", "", "BTC"])
def test_quote_rejects_unsupported_currency(currency):
    with pytest.raises(ValidationDomainError):
        _pricing().quote(package_id=None, amount=Decimal(10), currency=currency)


@pytest.mark.parametrize("by_code", [False, True])
@pytest.mark.parametrize("currency,price", [("BRL", "30.00"), ("usd", "7.00")])
def test_package_lookup_by_uuid_or_code_overrides_custom_amount(by_code, currency, price):
    package = CoinPackage.objects.create(code="test-code", name="Teste", coins=50, price_brl=30, price_usd=7)
    quote = _pricing().quote(package_id=package.code if by_code else str(package.id), amount=Decimal(999), currency=currency)
    assert quote.amount == Decimal(price)
    assert quote.coins == 50
    assert quote.currency == currency.upper()


@pytest.mark.parametrize("identifier", ["nonexistent-code", str(uuid4())])
def test_missing_package_is_domain_not_found(identifier):
    with pytest.raises(EntityNotFoundError):
        _pricing().quote(package_id=identifier, amount=None, currency="BRL")


def test_inactive_package_is_not_for_sale():
    package = CoinPackage.objects.create(code="inactive", name="Inativo", coins=50, price_brl=30, price_usd=7, active=False)
    with pytest.raises(EntityNotFoundError):
        _pricing().quote(package_id=str(package.id), amount=None, currency="BRL")


@pytest.mark.parametrize("currency,expected", [("BRL", "25.02"), ("USD", "60.06")])
def test_quote_uses_active_exchange_rate_and_decimal_rounding(currency, expected):
    CoinConfig.objects.create(name="Teste", multiplier="2.50", usd_multiplier="6")
    quote = _pricing().quote(package_id=None, amount=Decimal("10.01"), currency=currency)
    # Decimal usa ROUND_HALF_EVEN: 25.025 arredonda para 25.02.
    assert quote.coins == Decimal(expected)
