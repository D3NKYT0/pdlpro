"""Contratos dos SDKs externos: nenhuma cobrança ou chamada de rede real."""
from decimal import Decimal
from types import SimpleNamespace
from uuid import uuid4

import pytest

from apps.payment.domain.exceptions import (
    PaymentGatewayError,
    PaymentMethodUnavailableError,
)
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
    assert payload["payer"]["first_name"] == "Jogador"
    assert payload["payer"]["last_name"] == "Jogador"


def test_mercadopago_includes_payer_name(order, mocker):
    sdk = mocker.patch("mercadopago.SDK").return_value
    create = sdk.payment.return_value.create
    create.return_value = {"status": 201, "response": {"id": "mp-test", "status": "pending"}}
    MercadoPagoGateway().process_payment(
        order,
        {
            "payment_method_id": "pix",
            "payer": {
                "email": "hero@test.dev",
                "first_name": "Daniel",
                "last_name": "Amaral",
                "identification": {"type": "cpf", "number": "123.456.789-09"},
            },
        },
    )
    payload = create.call_args.args[0]
    assert payload["payer"]["first_name"] == "Daniel"
    assert payload["payer"]["last_name"] == "Amaral"
    assert payload["payer"]["entity_type"] == "individual"


def test_mercadopago_sets_association_entity_type_for_cnpj(order, mocker):
    sdk = mocker.patch("mercadopago.SDK").return_value
    create = sdk.payment.return_value.create
    create.return_value = {"status": 201, "response": {"id": "mp-test", "status": "pending"}}
    MercadoPagoGateway().process_payment(
        order,
        {
            "payment_method_id": "pix",
            "payer": {
                "email": "corp@test.dev",
                "identification": {"type": "CNPJ", "number": "12.345.678/0001-90"},
            },
        },
    )
    payload = create.call_args.args[0]
    assert payload["payer"]["entity_type"] == "association"
    assert payload["payer"]["identification"] == {"type": "CNPJ", "number": "12345678000190"}


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


def test_mercadopago_rejects_disabled_payment_options(order, settings, mocker):
    sdk = mocker.patch("mercadopago.SDK")

    payer_payload = {
        "payer": {"identification": {"type": "CPF", "number": "123.456.789-09"}},
    }

    # PIX disabled
    settings.MERCADO_PAGO_ENABLE_PIX = False
    with pytest.raises(PaymentGatewayError, match="PIX"):
        MercadoPagoGateway().process_payment(order, {**payer_payload, "payment_method_id": "pix"})

    # Boleto disabled
    settings.MERCADO_PAGO_ENABLE_PIX = True
    settings.MERCADO_PAGO_ENABLE_BOLETO = False
    with pytest.raises(PaymentGatewayError, match="Boleto"):
        MercadoPagoGateway().process_payment(order, {**payer_payload, "payment_method_id": "bolbradesco"})

    # Credit card disabled
    settings.MERCADO_PAGO_ENABLE_BOLETO = True
    settings.MERCADO_PAGO_ENABLE_CREDIT_CARD = False
    with pytest.raises(PaymentGatewayError, match="Cartão de Crédito"):
        MercadoPagoGateway().process_payment(order, {**payer_payload, "token": "card-token-123"})

    # Debit card disabled
    settings.MERCADO_PAGO_ENABLE_CREDIT_CARD = True
    settings.MERCADO_PAGO_ENABLE_DEBIT_CARD = False
    with pytest.raises(PaymentGatewayError, match="Cartão de Débito"):
        MercadoPagoGateway().process_payment(
            order,
            {**payer_payload, "token": "card-token-123", "payment_type_id": "debit_card"},
        )

    sdk.assert_not_called()



@pytest.mark.parametrize("description", ["Créditos do servidor", "", "   "])
def test_configurable_payment_descriptions(order, settings, mocker, description):
    settings.STRIPE_PAYMENT_DESCRIPTION = description
    settings.MERCADO_PAGO_PAYMENT_DESCRIPTION = description
    stripe_create = mocker.patch("stripe.PaymentIntent.create", return_value=SimpleNamespace(id="pi", client_secret="secret"))
    StripeGateway().create_checkout(order)
    assert stripe_create.call_args.kwargs["description"] == (description.strip() or "PDL PRO — 50.00 moedas")
    sdk = mocker.patch("mercadopago.SDK").return_value
    create = sdk.payment.return_value.create
    create.return_value = {"status": 201, "response": {"id": "mp", "status": "pending"}}
    MercadoPagoGateway().process_payment(order, {"description": "client override", "payment_method_id": "pix", "payer": {"identification": {"type": "CPF", "number": "12345678909"}}})
    assert create.call_args.args[0]["description"] == (description.strip() or "Moedas PDL (starter)")


@pytest.mark.parametrize("template", [
    "Créditos {quantidade} - {pacote}", "Créditos {quantity} - {package}",
    "Créditos {cantidad} - {paquete}",
])
@pytest.mark.parametrize("package", ["starter", ""])
def test_payment_description_variables_reach_both_providers(order, settings, mocker, template, package):
    order.package_code = package
    settings.STRIPE_PAYMENT_DESCRIPTION = template
    settings.MERCADO_PAGO_PAYMENT_DESCRIPTION = template
    expected = f"Créditos 50.00 - {package or 'custom'}"
    stripe_create = mocker.patch("stripe.PaymentIntent.create", return_value=SimpleNamespace(id="pi", client_secret="secret"))
    StripeGateway().create_checkout(order)
    assert stripe_create.call_args.kwargs["description"] == expected
    sdk = mocker.patch("mercadopago.SDK").return_value
    create = sdk.payment.return_value.create
    create.return_value = {"status": 201, "response": {"id": "mp", "status": "pending"}}
    MercadoPagoGateway().process_payment(order, {"payment_method_id": "pix", "payer": {"identification": {"type": "CPF", "number": "12345678909"}}})
    assert create.call_args.args[0]["description"] == expected


def test_description_keeps_unknown_tokens_and_never_expands_package_content(order):
    from apps.payment.domain.descriptions import payment_description

    order.package_code = "{quantidade}"
    assert payment_description(" {pacote} {unknown} {quantidade} {quantidade.__class__} ", order, default="fallback") == "{quantidade} {unknown} 50.00 {quantidade.__class__}"
