from __future__ import annotations

from django.conf import settings

from apps.payment.domain.exceptions import PaymentMethodUnavailableError
from apps.payment.domain.gateways import (
    IPaymentGateway,
    IPaymentGatewayRegistry,
    normalize_brl_method_priority,
)
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from apps.payment.infrastructure.mock_gateway import MockPaymentGateway
from apps.payment.infrastructure.stripe_gateway import StripeGateway


def _stripe_presentment_currencies() -> list[str]:
    raw = getattr(settings, "STRIPE_PRESENTMENT_CURRENCIES", "BRL,USD")
    if isinstance(raw, str):
        currencies = [c.strip().upper() for c in raw.split(",") if c.strip()]
    elif isinstance(raw, (list, tuple, set)):
        currencies = [str(c).strip().upper() for c in raw if str(c).strip()]
    else:
        currencies = ["BRL", "USD"]
    return currencies or ["BRL", "USD"]


class PaymentGatewayRegistry(IPaymentGatewayRegistry):
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
            if name == "mercadopago":
                currencies = ["BRL"]
            elif name == "stripe":
                currencies = _stripe_presentment_currencies()
            else:
                currencies = ["BRL", "USD"]
            entry: dict[str, object] = {
                "id": name,
                "public_key": gateway.public_key(),
                "currencies": currencies,
                "auto_confirm": name == "mock" and getattr(settings, "PAYMENT_MOCK_AUTO_CONFIRM", False),
            }
            if name == "mercadopago":
                entry["options"] = {
                    "pix": getattr(settings, "MERCADO_PAGO_ENABLE_PIX", True),
                    "boleto": getattr(settings, "MERCADO_PAGO_ENABLE_BOLETO", True),
                    "credit_card": getattr(settings, "MERCADO_PAGO_ENABLE_CREDIT_CARD", True),
                    "debit_card": getattr(settings, "MERCADO_PAGO_ENABLE_DEBIT_CARD", True),
                }
            methods.append(entry)
        return self._apply_brl_priority(methods)

    def _apply_brl_priority(self, methods: list[dict]) -> list[dict]:
        """Quando os dois gateways estão ativos, a política do admin restringe o BRL.

        ``user_choice`` mantém os dois. ``mercadopago`` tira BRL do Stripe (USD continua),
        mas expõe ``retry_currencies`` para repetir pedidos Stripe existentes em outra moeda.
        ``stripe`` tira o Mercado Pago. Com só um gateway disponível, a política não muda a lista.
        """

        priority = normalize_brl_method_priority(getattr(settings, "PAYMENT_BRL_METHOD_PRIORITY", "user_choice"))
        if priority == "user_choice":
            return methods
        ids = {str(item["id"]) for item in methods}
        if "mercadopago" not in ids or "stripe" not in ids:
            return methods
        if priority == "stripe":
            return [item for item in methods if item["id"] != "mercadopago"]
        narrowed: list[dict] = []
        for item in methods:
            if item["id"] != "stripe":
                narrowed.append(item)
                continue
            currencies = [code for code in item.get("currencies", []) if code != "BRL"]
            if currencies:
                narrowed.append({**item, "currencies": currencies, "retry_currencies": item.get("currencies", [])})
        return narrowed

    def register(self, gateway: IPaymentGateway) -> None:
        """Inclui um adaptador da extensão. Inclua o ``method_name`` em ``PAYMENT_METHODS``."""

        name = (gateway.method_name or "").strip().lower()
        if not name:
            raise PaymentMethodUnavailableError("Gateway de extensão sem method_name.")
        self._gateways[name] = gateway
