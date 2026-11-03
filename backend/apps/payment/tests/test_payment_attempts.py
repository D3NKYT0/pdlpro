"""LBN-05/LBN-06: tentativas de cobrança com chave persistida e aprovação após falha.

Somente o SDK do Mercado Pago é simulado; pedido, carteira e tentativas usam o ORM real.
"""

from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payment.application.use_cases import (
    ApplyGatewayPaymentInput,
    ApplyGatewayPaymentUseCase,
)
from apps.payment.infrastructure.models import PaymentAttempt, PedidoPagamento
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db

PIX = {"payment_method_id": "pix", "payer": {"email": "p@test.dev", "identification": {"type": "CPF", "number": "12345678909"}}}


@pytest.fixture(autouse=True)
def mercadopago(settings):
    settings.PAYMENT_METHODS = ["mercadopago"]
    settings.MERCADO_PAGO_ACTIVATE_PAYMENTS = True
    settings.MERCADO_PAGO_ACCESS_TOKEN = "mp-token"
    settings.MERCADO_PAGO_PUBLIC_KEY = "mp-pk"
    settings.MERCADO_PAGO_CHECKOUT_MODE = "embedded"


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(username="attempts", email="attempts@test.dev")


@pytest.fixture
def api(owner):
    client = APIClient()
    client.force_authenticate(owner)
    return client


@pytest.fixture
def order(owner):
    return PedidoPagamento.objects.create(user=owner, amount=20, coins=20, currency="BRL", method="mercadopago", status="pending")


@pytest.fixture
def sdk(mocker):
    return mocker.patch("mercadopago.SDK").return_value


def _keys(sdk):
    return [call.args[1].custom_headers["x-idempotency-key"] for call in sdk.payment.return_value.create.call_args_list]


def _process(api, order):
    return api.post(f"/api/v1/customer/payments/{order.id}/process/", PIX, format="json")


def test_approved_retry_after_rejection_credits_once(api, order, owner, sdk):
    sdk.payment.return_value.create.side_effect = [
        {"status": 201, "response": {"id": "mp-1", "status": "rejected"}},
        {"status": 201, "response": {"id": "mp-2", "status": "approved"}},
    ]

    first = _process(api, order)
    order.refresh_from_db()
    assert first.status_code == 200, first.data
    assert order.status == "failed"
    second = _process(api, order)

    assert second.status_code == 200, second.data
    order.refresh_from_db()
    assert order.status == "confirmed"
    assert order.external_id == "mp-2"
    assert Wallet.objects.get(user=owner).balance == 20
    assert len(set(_keys(sdk))) == 2
    assert list(PaymentAttempt.objects.filter(order=order).values_list("number", "external_id", "status")) == [
        (1, "mp-1", "rejected"),
        (2, "mp-2", "approved"),
    ]
    third = _process(api, order)
    assert third.status_code == 200
    assert sdk.payment.return_value.create.call_count == 2
    assert WalletTransaction.objects.filter(wallet__user=owner, kind="ENTRADA").count() == 1


def test_resend_of_a_pending_charge_reconciles_instead_of_charging_again(api, order, sdk):
    sdk.payment.return_value.create.return_value = {"status": 201, "response": {"id": "mp-pix", "status": "pending"}}
    sdk.payment.return_value.get.return_value = {"status": 200, "response": {"id": "mp-pix", "status": "pending"}}

    assert _process(api, order).status_code == 200
    resent = _process(api, order)

    assert resent.status_code == 200, resent.data
    assert sdk.payment.return_value.create.call_count == 1
    sdk.payment.return_value.get.assert_called_with("mp-pix")
    order.refresh_from_db()
    assert order.external_id == "mp-pix"
    assert order.status == "processing"


def test_pending_charge_approved_meanwhile_is_settled_on_resend(api, order, owner, sdk):
    sdk.payment.return_value.create.return_value = {"status": 201, "response": {"id": "mp-pix", "status": "pending"}}
    assert _process(api, order).status_code == 200
    sdk.payment.return_value.get.return_value = {"status": 200, "response": {"id": "mp-pix", "status": "approved"}}

    resent = _process(api, order)

    assert resent.status_code == 200
    assert sdk.payment.return_value.create.call_count == 1
    order.refresh_from_db()
    assert order.status == "confirmed"
    assert Wallet.objects.get(user=owner).balance == 20


def test_timeout_before_response_reuses_the_same_idempotency_key(api, order, sdk):
    sdk.payment.return_value.create.side_effect = [
        TimeoutError("sem resposta"),
        {"status": 201, "response": {"id": "mp-ok", "status": "pending"}},
    ]
    assert _process(api, order).status_code >= 500

    assert _process(api, order).status_code == 200

    keys = _keys(sdk)
    assert len(keys) == 2 and keys[0] == keys[1]
    assert PaymentAttempt.objects.filter(order=order).count() == 1


def test_provider_refusal_without_charge_opens_a_new_attempt(api, order, sdk):
    sdk.payment.return_value.create.side_effect = [
        {"status": 400, "response": {"message": "cartão inválido"}},
        {"status": 201, "response": {"id": "mp-ok", "status": "pending"}},
    ]
    assert _process(api, order).status_code >= 400
    assert _process(api, order).status_code == 200
    assert len(set(_keys(sdk))) == 2


def test_late_approval_of_previous_attempt_is_credited_once(owner, order, sdk, api):
    sdk.payment.return_value.create.side_effect = [
        {"status": 201, "response": {"id": "mp-old", "status": "rejected"}},
    ]
    _process(api, order)
    order.refresh_from_db()
    assert order.status == "failed"
    apply = DependencyInjection.root().create_scope().resolve(ApplyGatewayPaymentUseCase)

    for _ in range(2):
        apply.execute(ApplyGatewayPaymentInput(external_id="mp-old", order_id=order.id, approved=True))

    order.refresh_from_db()
    assert order.status == "confirmed"
    assert Wallet.objects.get(user=owner).balance == 20


def test_failed_order_is_not_settled_by_an_unrelated_reference(owner, order):
    order.status = "failed"
    order.external_id = "mp-mine"
    order.save()
    apply = DependencyInjection.root().create_scope().resolve(ApplyGatewayPaymentUseCase)

    result = apply.execute(ApplyGatewayPaymentInput(external_id="mp-foreign", order_id=order.id, approved=True))

    assert result is None
    order.refresh_from_db()
    assert order.status == "failed"
    assert not WalletTransaction.objects.exists()


def test_status_poll_never_settles_a_refunded_payment(api, order, owner, sdk):
    order.status = "processing"
    order.external_id = "mp-r"
    order.save()
    sdk.payment.return_value.get.return_value = {
        "status": 200, "response": {"id": "mp-r", "status": "refunded", "transaction_amount": 20},
    }

    response = api.get(f"/api/v1/customer/payments/{order.id}/status/")

    assert response.status_code == 200
    order.refresh_from_db()
    assert order.status == "failed"
    assert Wallet.objects.filter(user=owner, balance__gt=Decimal(0)).count() == 0


def test_legacy_processing_order_reconciles_its_open_charge_first(api, order, sdk):
    order.status = "processing"
    order.external_id = "mp-legacy"
    order.save()
    sdk.payment.return_value.get.return_value = {"status": 200, "response": {"id": "mp-legacy", "status": "pending"}}

    assert _process(api, order).status_code == 200

    sdk.payment.return_value.create.assert_not_called()
    assert PaymentAttempt.objects.get(order=order).external_id == "mp-legacy"
