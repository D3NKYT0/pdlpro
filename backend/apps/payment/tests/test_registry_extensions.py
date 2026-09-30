from apps.payment.domain.entities import CheckoutSession, PaymentOrderEntity
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from apps.payment.infrastructure.mock_gateway import MockPaymentGateway
from apps.payment.infrastructure.registry import PaymentGatewayRegistry
from apps.payment.infrastructure.stripe_gateway import StripeGateway


class _PixStub:
    method_name = "pix"

    def is_available(self) -> bool:
        return True

    def public_key(self) -> str:
        return "pix-public"

    def create_checkout(self, order: PaymentOrderEntity) -> CheckoutSession:
        return CheckoutSession(external_id="pix-1", checkout_url="")


def test_registry_accepts_gateway_from_extension(settings):
    settings.STRIPE_ACTIVATE_PAYMENTS = False
    settings.MERCADO_PAGO_ACTIVATE_PAYMENTS = False
    registry = PaymentGatewayRegistry(MockPaymentGateway(), MercadoPagoGateway(), StripeGateway())
    registry.register(_PixStub())
    assert registry.get("pix").public_key() == "pix-public"
    methods = registry.available_methods(["mock", "pix"])
    assert {item["id"] for item in methods} >= {"mock", "pix"}


def test_registry_mercadopago_exposes_payment_options(settings):
    settings.MERCADO_PAGO_ACTIVATE_PAYMENTS = True
    settings.MERCADO_PAGO_ACCESS_TOKEN = "token"
    settings.MERCADO_PAGO_PUBLIC_KEY = "pk"
    settings.MERCADO_PAGO_ENABLE_PIX = True
    settings.MERCADO_PAGO_ENABLE_BOLETO = False
    settings.MERCADO_PAGO_ENABLE_CREDIT_CARD = True
    settings.MERCADO_PAGO_ENABLE_DEBIT_CARD = False

    registry = PaymentGatewayRegistry(MockPaymentGateway(), MercadoPagoGateway(), StripeGateway())
    methods = registry.available_methods(["mercadopago"])
    mp = next(m for m in methods if m["id"] == "mercadopago")
    assert mp["options"] == {
        "pix": True,
        "boleto": False,
        "credit_card": True,
        "debit_card": False,
    }

