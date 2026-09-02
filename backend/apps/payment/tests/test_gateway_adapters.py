"""Contratos dos SDKs externos: nenhuma cobrança ou chamada de rede real."""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from apps.payment.domain.exceptions import PaymentGatewayError, PaymentMethodUnavailableError
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from apps.payment.infrastructure.stripe_gateway import StripeGateway


@pytest.fixture
def order():
    return SimpleNamespace(id=uuid4(), user_id=uuid4(), amount=Decimal("12.34"), coins=Decimal("50.00"), currency="USD", package_code="starter", external_id="payment-1")


@pytest.fixture(autouse=True)
def configured(settings):
    settings.STRIPE_ACTIVATE_PAYMENTS = True
    settings.STRIPE_SECRET_KEY = "sk-test"
    settings.STRIPE_PUBLISHABLE_KEY = "pk-test"
    settings.MERCADO_PAGO_ACTIVATE_PAYMENTS = True
    settings.MERCADO_PAGO_ACCESS_TOKEN = "test-token"
    settings.MERCADO_PAGO_PUBLIC_KEY = "test-public"


def test_stripe_creates_intent_in_cents_with_order_metadata(order, mocker):
    create = mocker.patch("stripe.PaymentIntent.create", return_value=SimpleNamespace(id="pi-test", client_secret="secret"))
    result = StripeGateway().create_checkout(order)
    assert result.external_id == "pi-test"
    assert result.client_secret == "secret"
    assert create.call_args.kwargs["amount"] == 1234
    assert create.call_args.kwargs["currency"] == "usd"
    assert create.call_args.kwargs["metadata"] == {"order_id": str(order.id), "user_id": str(order.user_id), "coins": "50.00"}


@pytest.mark.parametrize("status,expected", [("succeeded", "approved"), ("canceled", "rejected"), ("processing", "pending"), ("requires_action", "pending")])
def test_stripe_maps_provider_status(order, mocker, status, expected):
    retrieve = mocker.patch("stripe.PaymentIntent.retrieve", return_value=SimpleNamespace(id="pi-test", status=status))
    assert StripeGateway().fetch_status(order).status == expected
    retrieve.assert_called_once_with("payment-1")


def test_stripe_failure_is_domain_error(order, mocker):
    mocker.patch("stripe.PaymentIntent.create", side_effect=TimeoutError("provider"))
    with pytest.raises(PaymentGatewayError):
        StripeGateway().create_checkout(order)


def test_disabled_stripe_does_not_call_sdk(order, settings, mocker):
    settings.STRIPE_ACTIVATE_PAYMENTS = False
    create = mocker.patch("stripe.PaymentIntent.create")
    with pytest.raises(PaymentMethodUnavailableError):
        StripeGateway().create_checkout(order)
    assert StripeGateway().fetch_status(order) is None
    create.assert_not_called()


@pytest.mark.parametrize("status,expected", [("approved", "approved"), ("rejected", "rejected"), ("cancelled", "rejected"), ("in_process", "pending"), (None, "pending")])
def test_mercadopago_maps_status_and_pix_payload(order, mocker, status, expected):
    sdk = mocker.patch("mercadopago.SDK").return_value
    sdk.payment.return_value.get.return_value = {"status": 200, "response": {"id": 123, "status": status, "point_of_interaction": {"transaction_data": {"qr_code": "pix-copy", "qr_code_base64": "image"}}}}
    result = MercadoPagoGateway().fetch_status(order)
    assert result.status == expected
    assert result.external_id == "123"
    assert result.pix_qr_code == "pix-copy"
    assert result.pix_qr_code_base64 == "image"


def test_mercadopago_uses_order_amount_not_client_amount(order, mocker):
    sdk = mocker.patch("mercadopago.SDK").return_value
    create = sdk.payment.return_value.create
    create.return_value = {"status": 201, "response": {"id": "mp-test", "status": "pending"}}
    MercadoPagoGateway().process_payment(order, {"transaction_amount": 0.01, "payment_method_id": "pix", "payer": {"email": "hero@test.dev", "identification": {"type": "cpf", "number": "123.456.789-09"}}})
    payload = create.call_args.args[0]
    assert payload["transaction_amount"] == 12.34
    assert payload["metadata"]["order_id"] == str(order.id)
    assert payload["payer"]["identification"] == {"type": "CPF", "number": "12345678909"}


@pytest.mark.parametrize("payer", [None, {}, {"identification": {"type": "INVALID", "number": "123"}}])
def test_mercadopago_rejects_missing_document_before_sdk(order, mocker, payer):
    sdk = mocker.patch("mercadopago.SDK")
    with pytest.raises(PaymentGatewayError):
        MercadoPagoGateway().process_payment(order, {"payer": payer})
    sdk.assert_not_called()


def test_mercadopago_rejection_preserves_provider_message(order, mocker):
    sdk = mocker.patch("mercadopago.SDK").return_value
    sdk.payment.return_value.create.return_value = {"status": 400, "response": {"cause": [{"description": "Documento inválido"}]}}
    with pytest.raises(PaymentGatewayError, match="Documento inválido"):
        MercadoPagoGateway().process_payment(order, {"payer": {"identification": {"type": "CPF", "number": "123"}}})


def test_mercadopago_missing_payment_returns_none(order, mocker):
    sdk = mocker.patch("mercadopago.SDK").return_value
    sdk.payment.return_value.get.return_value = {"status": 404}
    assert MercadoPagoGateway().fetch_status(order) is None
