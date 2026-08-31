from __future__ import annotations

import logging
from decimal import Decimal

from django.conf import settings

from apps.payment.domain.entities import CheckoutSession, PaymentOrderEntity, ProcessResult
from apps.payment.domain.exceptions import PaymentGatewayError, PaymentMethodUnavailableError
from apps.payment.domain.gateways import IPaymentGateway

logger = logging.getLogger(__name__)


class StripeGateway(IPaymentGateway):
    method_name = "stripe"

    def is_available(self) -> bool:
        return bool(
            getattr(settings, "STRIPE_ACTIVATE_PAYMENTS", False)
            and getattr(settings, "STRIPE_SECRET_KEY", "")
            and getattr(settings, "STRIPE_PUBLISHABLE_KEY", "")
        )

    def public_key(self) -> str:
        return getattr(settings, "STRIPE_PUBLISHABLE_KEY", "") or ""

    def _configure(self) -> None:
        import stripe

        if not self.is_available():
            raise PaymentMethodUnavailableError("Stripe não está habilitado.")
        stripe.api_key = settings.STRIPE_SECRET_KEY

    def create_checkout(self, order: PaymentOrderEntity) -> CheckoutSession:
        import stripe

        self._configure()
        try:
            cents = int((order.amount * 100).quantize(Decimal("1")))
            intent = stripe.PaymentIntent.create(
                amount=cents,
                currency=order.currency.lower(),
                metadata={
                    "order_id": str(order.id),
                    "user_id": str(order.user_id),
                    "coins": str(order.coins),
                },
                automatic_payment_methods={"enabled": True},
                description=f"PDL PRO — {order.coins} moedas",
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Stripe falhou ao criar PaymentIntent")
            raise PaymentGatewayError("Não foi possível iniciar o pagamento Stripe.") from exc
        return CheckoutSession(
            external_id=str(intent.id),
            checkout_url="",
            client_secret=str(intent.client_secret or ""),
            public_key=self.public_key(),
        )

    def fetch_status(self, order: PaymentOrderEntity) -> ProcessResult | None:
        import stripe

        if not order.external_id or not self.is_available():
            return None
        self._configure()
        intent = stripe.PaymentIntent.retrieve(order.external_id)
        mapped = {"succeeded": "approved", "canceled": "rejected"}.get(intent.status, "pending")
        return ProcessResult(status=mapped, external_id=str(intent.id), raw={"status": intent.status})
