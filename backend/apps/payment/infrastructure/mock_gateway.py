from __future__ import annotations

from apps.payment.domain.entities import CheckoutSession, PaymentOrderEntity
from apps.payment.domain.gateways import IPaymentGateway


class MockPaymentGateway(IPaymentGateway):
    """Checkout local para desenvolvimento e testes. Não chama provedor externo."""

    def create_checkout(self, order: PaymentOrderEntity) -> CheckoutSession:
        return CheckoutSession(
            external_id=str(order.id),
            checkout_url=f"/wallet?deposit={order.id}",
        )
