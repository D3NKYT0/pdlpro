from __future__ import annotations

import logging
from decimal import Decimal

from django.conf import settings

from apps.payment.domain.descriptions import payment_description
from apps.payment.domain.entities import (
    CheckoutSession,
    PaymentOrderEntity,
    ProcessResult,
)
from apps.payment.domain.exceptions import (
    PaymentGatewayError,
    PaymentMethodUnavailableError,
)
from apps.payment.domain.gateways import IPaymentGateway
from apps.payment.infrastructure.checkout import (
    checkout_return_url,
    provider_checkout_url,
)
from common.currency_identity import coin_display_name

logger = logging.getLogger(__name__)


class StripeGateway(IPaymentGateway):
    """Adaptador de IPaymentGateway para processamento de pagamentos Stripe.

    Obtenha a instância pelo PaymentGatewayRegistry. Mantém a comunicação com o provedor e
    converte os resultados para o contrato da aplicação. A liquidação da carteira e a validação
    de webhooks ficam em serviços próprios.
    """

    method_name = "stripe"

    def is_available(self) -> bool:
        return bool(
            getattr(settings, "STRIPE_ACTIVATE_PAYMENTS", False)
            and getattr(settings, "STRIPE_SECRET_KEY", "")
            and (getattr(settings, "STRIPE_CHECKOUT_MODE", "embedded") == "redirect" or getattr(settings, "STRIPE_PUBLISHABLE_KEY", ""))
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
            cents = int((order.amount * 100).quantize(Decimal(1)))
            if getattr(settings, "STRIPE_CHECKOUT_MODE", "embedded") == "redirect":
                metadata = {"order_id": str(order.id), "user_id": str(order.user_id), "coins": str(order.coins)}
                description = payment_description(getattr(settings, "STRIPE_PAYMENT_DESCRIPTION", ""), order, default=f"PDL PRO — {order.coins} {coin_display_name()}", coin_name=coin_display_name())
                session = stripe.checkout.Session.create(
                    mode="payment", success_url=checkout_return_url(order.id), cancel_url=checkout_return_url(order.id),
                    client_reference_id=str(order.id), metadata=metadata,
                    payment_intent_data={"metadata": metadata, "description": description},
                    line_items=[{"quantity": 1, "price_data": {"currency": order.currency.lower(), "unit_amount": cents, "product_data": {"name": description}}}],
                    idempotency_key=f"pdl-checkout-{order.id}",
                )
                if not str(session.id).startswith("cs_"):
                    raise PaymentGatewayError("Não foi possível iniciar o pagamento externo.")
                return CheckoutSession(external_id=str(session.id), checkout_url=provider_checkout_url(session.url, "stripe"))
            intent = stripe.PaymentIntent.create(
                amount=cents,
                currency=order.currency.lower(),
                metadata={
                    "order_id": str(order.id),
                    "user_id": str(order.user_id),
                    "coins": str(order.coins),
                },
                automatic_payment_methods={"enabled": True},
                description=payment_description(
                    getattr(settings, "STRIPE_PAYMENT_DESCRIPTION", ""), order, default=f"PDL PRO — {order.coins} {coin_display_name()}", coin_name=coin_display_name(),
                ),
            )
        except Exception as exc:
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
        if order.external_id.startswith("cs_"):
            session = stripe.checkout.Session.retrieve(order.external_id)
            mapped = "approved" if session.payment_status == "paid" else "rejected" if session.status == "expired" else "pending"
            return ProcessResult(status=mapped, external_id=str(session.id), raw={"status": session.status})
        intent = stripe.PaymentIntent.retrieve(order.external_id)
        mapped = {"succeeded": "approved", "canceled": "rejected"}.get(intent.status, "pending")
        return ProcessResult(status=mapped, external_id=str(intent.id), raw={"status": intent.status})
