from __future__ import annotations

from django.conf import settings

from apps.payment.domain.exceptions import PaymentMethodUnavailableError
from apps.payment.domain.gateways import IPaymentGateway
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from apps.payment.infrastructure.mock_gateway import MockPaymentGateway
from apps.payment.infrastructure.stripe_gateway import StripeGateway


class PaymentGatewayRegistry:
    """Seleciona adaptadores de pagamento por nome do método.

    ``get(method)`` exige um adaptador cadastrado e disponível; caso contrário, lança
    PaymentMethodUnavailableError. ``available_methods(configured)`` filtra a lista configurada
    e expõe somente metadados públicos. A política de métodos habilitados é aplicada pelos casos
    de uso antes da seleção.
    """

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
        """Retorna o gateway disponível ou lança PaymentMethodUnavailableError."""

        gateway = self._gateways.get(method)
        if gateway is None:
            raise PaymentMethodUnavailableError(f"Método '{method}' não está habilitado.")
        if not gateway.is_available():
            raise PaymentMethodUnavailableError(f"Método '{method}' não está configurado.")
        return gateway

    def available_methods(self, configured: list[str]) -> list[dict]:
        """Filtra métodos configurados e retorna chaves públicas, moedas e opções de UI."""

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
