from __future__ import annotations

from django.conf import settings

from apps.payment.domain.exceptions import PaymentMethodUnavailableError
from apps.payment.domain.gateways import IPaymentGateway
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from apps.payment.infrastructure.mock_gateway import MockPaymentGateway
from apps.payment.infrastructure.stripe_gateway import StripeGateway


class PaymentGatewayRegistry:
    def __init__(
        self,
        mock: MockPaymentGateway,
        mercadopago: MercadoPagoGateway,
        stripe: StripeGateway,
    ) -> None:
        self._gateways: dict[str, IPaymentGateway] = {
            mock.method_name: mock,
            mercadopago.method_name: mercadopago,
            stripe.method_name: stripe,
        }

    def get(self, method: str) -> IPaymentGateway:
        gateway = self._gateways.get(method)
        if gateway is None:
            raise PaymentMethodUnavailableError(f"Método '{method}' não está habilitado.")
        if not gateway.is_available():
            raise PaymentMethodUnavailableError(f"Método '{method}' não está configurado.")
        return gateway

    def available_methods(self, configured: list[str]) -> list[dict]:
        methods = []
        for name in configured:
            gateway = self._gateways.get(name)
            if gateway is None or not gateway.is_available():
                continue
            methods.append(
                {
                    "id": name,
                    "public_key": gateway.public_key(),
                    "currencies": ["BRL"] if name == "mercadopago" else ["USD", "BRL"] if name == "stripe" else ["BRL", "USD"],
                    "auto_confirm": name == "mock" and getattr(settings, "PAYMENT_MOCK_AUTO_CONFIRM", False),
                }
            )
        return methods
