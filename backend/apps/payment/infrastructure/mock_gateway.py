from __future__ import annotations

from apps.payment.domain.entities import CheckoutSession, PaymentOrderEntity, ProcessResult
from apps.payment.domain.gateways import IPaymentGateway


class MockPaymentGateway(IPaymentGateway):
    method_name = "mock"

    def create_checkout(self, order: PaymentOrderEntity) -> CheckoutSession:
        return CheckoutSession(
            external_id=str(order.id),
            checkout_url=f"/wallet?deposit={order.id}",
        )

    def process_payment(self, order: PaymentOrderEntity, payload: dict) -> ProcessResult:
        return ProcessResult(status="approved", external_id=str(order.id), message="Pagamento mock aprovado.")
