"""LBN-04: estornos, chargebacks e disputas conciliam a carteira uma única vez.

Webhooks entram com assinatura já validada; somente o SDK do provedor é simulado.
"""

from decimal import Decimal
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.payment.application.reversals import (
    ReconcilePaymentReversalInput,
    ReconcilePaymentReversalUseCase,
)
from apps.payment.application.webhooks import (
    HandleMercadoPagoWebhookInput,
    HandleMercadoPagoWebhookUseCase,
    HandleStripeWebhookInput,
    HandleStripeWebhookUseCase,
)
from apps.payment.infrastructure.models import (
    PaymentAttempt,
    PaymentReversal,
    PedidoPagamento,
)
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from common.architecture.exceptions import ValidationDomainError
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def providers(settings):
    settings.PAYMENT_METHODS = ["mercadopago", "stripe"]
    settings.MERCADO_PAGO_ACTIVATE_PAYMENTS = True
    settings.MERCADO_PAGO_ACCESS_TOKEN = "mp-token"
    settings.MERCADO_PAGO_PUBLIC_KEY = "mp-pk"
    settings.STRIPE_ACTIVATE_PAYMENTS = True
    settings.STRIPE_SECRET_KEY = "sk-test"
    settings.STRIPE_PUBLISHABLE_KEY = "pk-test"


@pytest.fixture
def owner():
    return get_user_model().objects.create_user(username="refunds", email="refunds@test.dev")


def _confirmed(owner, *, method="mercadopago", external_id="mp-paid", balance=100, bonus=10):
    order = PedidoPagamento.objects.create(
        user=owner, amount=Decimal(100), coins=Decimal(100), bonus_applied=Decimal(bonus),
        total_credited=Decimal(100 + bonus), currency="BRL", method=method, status="confirmed",
        external_id=external_id,
    )
    Wallet.objects.update_or_create(user=owner, defaults={"balance": Decimal(balance), "bonus_balance": Decimal(bonus)})
    return order


def _reconcile(order, kind, total=Decimal(0), key=None):
    use_case = DependencyInjection.root().create_scope().resolve(ReconcilePaymentReversalUseCase)
    return use_case.execute(
        ReconcilePaymentReversalInput(order_id=order.id, event_key=key or f"test:{uuid4()}", kind=kind, refunded_total=total)
    )


def _wallet(owner):
    return Wallet.objects.get(user=owner)


def test_partial_refunds_are_proportional_cumulative_and_capped(owner):
    order = _confirmed(owner)

    _reconcile(order, "refund", Decimal(30), key="mp:1:refund:30")
    assert (_wallet(owner).balance, _wallet(owner).bonus_balance) == (Decimal(70), Decimal(7))
    _reconcile(order, "refund", Decimal(30), key="mp:1:refund:30")
    _reconcile(order, "refund", Decimal(30), key="other-event-same-total")
    assert _wallet(owner).balance == 70
    _reconcile(order, "refund", Decimal(80))
    _reconcile(order, "refund", Decimal(500))

    order.refresh_from_db()
    assert (order.refunded_amount, order.coins_reversed, order.bonus_reversed) == (Decimal(100), Decimal(100), Decimal(10))
    assert (_wallet(owner).balance, _wallet(owner).bonus_balance) == (Decimal(0), Decimal(0))
    assert order.reversal_shortfall == 0
    assert order.review_status == ""
    debits = WalletTransaction.objects.filter(wallet__user=owner, kind="SAIDA")
    assert all(str(order.id) in description for description in debits.values_list("description", flat=True))


def test_chargeback_of_spent_balance_records_debt_and_requires_review(owner):
    order = _confirmed(owner, balance=40, bonus=10)
    Wallet.objects.filter(user=owner).update(bonus_balance=Decimal(0))

    _reconcile(order, "chargeback", key="mp:chargeback")
    _reconcile(order, "chargeback", key="mp:chargeback")
    _reconcile(order, "dispute_lost")

    order.refresh_from_db()
    assert _wallet(owner).balance == 0
    assert order.reversal_shortfall == Decimal(70)
    assert order.review_status == "manual_review"
    assert PaymentReversal.objects.filter(order=order, shortfall=Decimal(70)).count() == 1


def test_dispute_flags_review_without_debiting_and_win_clears_it(owner):
    order = _confirmed(owner)

    _reconcile(order, "dispute_opened", key="stripe:evt_open")
    order.refresh_from_db()
    assert order.review_status == "dispute"
    assert _wallet(owner).balance == 100
    _reconcile(order, "dispute_won", key="stripe:evt_won")
    order.refresh_from_db()
    assert order.review_status == ""
    assert _wallet(owner).balance == 100


def test_lost_dispute_reverses_the_whole_purchase(owner):
    order = _confirmed(owner)
    _reconcile(order, "dispute_opened")

    _reconcile(order, "dispute_lost")

    order.refresh_from_db()
    assert _wallet(owner).balance == 0
    assert order.review_status == ""
    assert order.refunded_amount == 100


def test_reversal_of_an_order_never_credited_does_not_touch_the_wallet(owner):
    order = _confirmed(owner)
    order.status = "processing"
    order.save()

    _reconcile(order, "chargeback")

    assert _wallet(owner).balance == 100
    assert PaymentReversal.objects.filter(order=order).count() == 1


def test_unknown_reversal_kind_is_rejected(owner):
    with pytest.raises(ValidationDomainError):
        _reconcile(_confirmed(owner), "gift")


@pytest.mark.parametrize(
    "response,balance",
    [
        ({"id": "mp-paid", "status": "refunded", "transaction_amount": 100, "transaction_amount_refunded": 100}, 0),
        ({"id": "mp-paid", "status": "charged_back", "transaction_amount": 100}, 0),
        ({"id": "mp-paid", "status": "approved", "transaction_amount": 100, "transaction_amount_refunded": 25}, 75),
        ({"id": "mp-paid", "status": "in_mediation", "transaction_amount": 100}, 100),
    ],
)
def test_mercadopago_webhook_reconciles_reversals_once(owner, mocker, response, balance):
    order = _confirmed(owner)
    sdk = mocker.patch("mercadopago.SDK").return_value
    sdk.payment.return_value.get.return_value = {"status": 200, "response": response}
    handler = DependencyInjection.root().create_scope().resolve(HandleMercadoPagoWebhookUseCase)

    for _ in range(2):
        handler.execute(HandleMercadoPagoWebhookInput(payload={"action": "payment.updated", "data": {"id": "mp-paid"}}))

    assert _wallet(owner).balance == balance
    assert PaymentReversal.objects.filter(order=order).count() == 1
    order.refresh_from_db()
    assert order.status == "confirmed"


def test_mercadopago_refund_of_previous_attempt_finds_the_order(owner, mocker):
    order = _confirmed(owner, external_id="mp-new")
    PaymentAttempt.objects.create(order=order, number=1, external_id="mp-old", status="approved")
    sdk = mocker.patch("mercadopago.SDK").return_value
    sdk.payment.return_value.get.return_value = {"status": 200, "response": {"id": "mp-old", "status": "refunded", "transaction_amount": 100}}
    handler = DependencyInjection.root().create_scope().resolve(HandleMercadoPagoWebhookUseCase)

    handler.execute(HandleMercadoPagoWebhookInput(payload={"action": "payment.updated", "data": {"id": "mp-old"}}))

    assert _wallet(owner).balance == 0


def _stripe(event_type, obj, event_id="evt_1"):
    handler = DependencyInjection.root().create_scope().resolve(HandleStripeWebhookUseCase)
    handler.execute(HandleStripeWebhookInput(event={"id": event_id, "type": event_type, "data": {"object": obj}}))


def test_stripe_refund_and_dispute_events_reconcile(owner):
    order = _confirmed(owner, method="stripe", external_id="pi_paid")

    _stripe("charge.refunded", {"id": "ch_1", "payment_intent": "pi_paid", "amount_refunded": 4000}, "evt_r1")
    _stripe("charge.refunded", {"id": "ch_1", "payment_intent": "pi_paid", "amount_refunded": 4000}, "evt_r1_retry")
    assert _wallet(owner).balance == 60
    _stripe("charge.dispute.created", {"id": "dp_1", "payment_intent": "pi_paid", "status": "needs_response"}, "evt_d1")
    order.refresh_from_db()
    assert order.review_status == "dispute"
    _stripe("charge.dispute.closed", {"id": "dp_1", "payment_intent": "pi_paid", "status": "lost"}, "evt_d2")

    order.refresh_from_db()
    assert _wallet(owner).balance == 0
    assert order.refunded_amount == 100
    assert PaymentReversal.objects.filter(order=order).count() == 3


def test_stripe_hosted_checkout_registers_the_intent_for_later_refunds(owner):
    order = PedidoPagamento.objects.create(
        user=owner, amount=100, coins=100, currency="BRL", method="stripe", status="pending", external_id="cs_hosted",
    )
    _stripe(
        "checkout.session.completed",
        {"id": "cs_hosted", "payment_status": "paid", "payment_intent": "pi_hosted", "metadata": {"order_id": str(order.id)}},
        "evt_paid",
    )
    assert _wallet(owner).balance == 100

    _stripe("charge.refunded", {"id": "ch_2", "payment_intent": "pi_hosted", "amount_refunded": 10000}, "evt_refund")

    assert _wallet(owner).balance == 0


def test_stripe_reversal_for_unknown_payment_is_ignored(owner):
    _stripe("charge.refunded", {"id": "ch_x", "payment_intent": "pi_unknown", "amount_refunded": 100})
    assert not PaymentReversal.objects.exists()


def test_status_poll_of_confirmed_order_reconciles_a_refund(owner, mocker):
    order = _confirmed(owner)
    sdk = mocker.patch("mercadopago.SDK").return_value
    sdk.payment.return_value.get.return_value = {"status": 200, "response": {"id": "mp-paid", "status": "refunded", "transaction_amount": 100}}
    api = APIClient()
    api.force_authenticate(owner)

    response = api.get(f"/api/v1/customer/payments/{order.id}/status/")

    assert response.status_code == 200, response.data
    assert _wallet(owner).balance == 0
    sdk.payment.return_value.get.side_effect = RuntimeError("provedor fora")
    assert api.get(f"/api/v1/customer/payments/{order.id}/status/").status_code == 200
