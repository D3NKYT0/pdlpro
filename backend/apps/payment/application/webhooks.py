from __future__ import annotations

import hashlib
import hmac
import json
import logging
import urllib.parse
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from django.conf import settings
from django.utils import timezone

from apps.payment.application.use_cases import (
    ApplyGatewayPaymentInput,
    ApplyGatewayPaymentUseCase,
)
from apps.payment.domain.repositories import IWebhookLogRepository
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from common.architecture.base import UseCase

logger = logging.getLogger(__name__)


class WebhookSignatureService:
    """Valida a autenticidade de notificações antes de aplicar pagamentos.

    ``mercado_pago_valid(request)`` confere HMAC e timestamp com tolerância de 300 segundos;
    retorna False se faltarem segredo, headers ou identificador. ``stripe_event(payload,
    signature)`` recebe os bytes originais do corpo e retorna o evento validado pelo SDK, ou
    None. Não credita carteiras nem substitui a consulta de status ao provedor.
    """

    def mercado_pago_valid(self, request) -> bool:
        x_signature = request.META.get("HTTP_X_SIGNATURE", "")
        x_request_id = request.META.get("HTTP_X_REQUEST_ID", "")
        secret = getattr(settings, "MERCADO_PAGO_WEBHOOK_SECRET", "") or ""
        if not secret or not x_signature or not x_request_id:
            return False
        query_params = urllib.parse.parse_qs(urllib.parse.urlparse(request.build_absolute_uri()).query)
        data_id = query_params.get("data.id", [None])[0]
        if not data_id:
            try:
                body = json.loads(request.body or b"{}")
                data_id = (body.get("data") or {}).get("id") or body.get("id")
            except json.JSONDecodeError:
                return False
        if not data_id:
            return False
        parts: dict[str, str] = {}
        for chunk in x_signature.split(","):
            if "=" not in chunk:
                return False
            key, value = chunk.strip().split("=", 1)
            parts[key.strip()] = value.strip()
        ts, received = parts.get("ts"), parts.get("v1")
        if not ts or not received:
            return False
        try:
            age = abs(int(timezone.now().timestamp()) - int(ts))
        except ValueError:
            return False
        if age > 300:
            return False
        manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
        expected = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, received)

    def stripe_event(self, payload: bytes, signature: str):
        import stripe

        secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "") or ""
        if not secret:
            return None
        try:
            return stripe.Webhook.construct_event(payload, signature, secret)
        except Exception:  # noqa: BLE001
            logger.warning("Assinatura Stripe inválida.")
            return None


@dataclass(frozen=True, slots=True)
class HandleMercadoPagoWebhookInput:
    """Payload já validado por assinatura para ``HandleMercadoPagoWebhookUseCase``."""

    payload: dict
    request_id: str = ""


class HandleMercadoPagoWebhookUseCase(UseCase[HandleMercadoPagoWebhookInput, None]):
    """Registra o webhook do Mercado Pago e liquida pagamentos aprovados.

    A view deve validar a assinatura com ``WebhookSignatureService`` antes de chamar
    ``execute``. Consulta o pagamento no gateway e aplica via ``ApplyGatewayPaymentUseCase``.
    """

    def __init__(
        self,
        logs: IWebhookLogRepository,
        gateway: MercadoPagoGateway,
        apply: ApplyGatewayPaymentUseCase,
    ) -> None:
        self._logs = logs
        self._gateway = gateway
        self._apply = apply

    def execute(self, data: HandleMercadoPagoWebhookInput) -> None:
        payload = data.payload
        event_id = str(payload.get("id") or data.request_id or "")
        data_id = str((payload.get("data") or {}).get("id") or "")
        self._logs.create(kind="mercadopago", data_id=event_id or data_id, payload=payload)
        action = payload.get("action") or payload.get("type")
        if action in {"payment.created", "payment", "payment.updated"} and data_id:
            result = self._gateway.fetch_by_id(data_id)
            if result and result.status == "approved":
                order_id = None
                metadata = (result.raw or {}).get("metadata") or {}
                if metadata.get("order_id"):
                    try:
                        order_id = UUID(str(metadata["order_id"]))
                    except ValueError:
                        order_id = None
                self._apply.execute(
                    ApplyGatewayPaymentInput(
                        external_id=result.external_id,
                        order_id=order_id,
                        approved=True,
                    )
                )


@dataclass(frozen=True, slots=True)
class HandleStripeWebhookInput:
    """Evento Stripe já validado por assinatura para ``HandleStripeWebhookUseCase``."""

    event: Any


class HandleStripeWebhookUseCase(UseCase[HandleStripeWebhookInput, None]):
    """Registra o webhook do Stripe e liquida pagamentos concluídos.

    A view deve validar a assinatura com ``WebhookSignatureService`` antes de chamar
    ``execute``. Aplica o crédito via ``ApplyGatewayPaymentUseCase``.
    """

    def __init__(self, logs: IWebhookLogRepository, apply: ApplyGatewayPaymentUseCase) -> None:
        self._logs = logs
        self._apply = apply

    def execute(self, data: HandleStripeWebhookInput) -> None:
        event = data.event
        self._logs.create(kind=event["type"], data_id=event["id"], payload=event)
        if event["type"] in {"payment_intent.succeeded", "checkout.session.completed"}:
            obj = event["data"]["object"]
            external_id = (
                obj.get("id") if event["type"] == "payment_intent.succeeded" else obj.get("payment_intent")
            )
            metadata = obj.get("metadata") or {}
            order_id = None
            if metadata.get("order_id"):
                try:
                    order_id = UUID(str(metadata["order_id"]))
                except ValueError:
                    order_id = None
            self._apply.execute(
                ApplyGatewayPaymentInput(
                    external_id=str(external_id or ""),
                    order_id=order_id,
                    approved=True,
                )
            )
