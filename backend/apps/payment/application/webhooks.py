from __future__ import annotations

import hashlib
import hmac
import json
import logging
import urllib.parse
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any
from uuid import UUID

from django.conf import settings
from django.utils import timezone

from apps.payment.application.reversals import (
    ReconcilePaymentReversalInput,
    ReconcilePaymentReversalUseCase,
)
from apps.payment.application.use_cases import (
    ApplyGatewayPaymentInput,
    ApplyGatewayPaymentUseCase,
    reversal_from_result,
)
from apps.payment.domain.gateways import IPaymentGatewayRegistry
from apps.payment.domain.repositories import (
    IPaymentOrderRepository,
    IWebhookLogRepository,
)
from common.architecture.base import UseCase

logger = logging.getLogger(__name__)

_WEBHOOK_TOP_KEYS = ("id", "type", "action", "livemode", "live_mode")
_WEBHOOK_OBJECT_KEYS = ("id", "status", "object")


def sanitize_webhook_payload(payload: Any) -> dict:
    """Guarda só identificadores e status do evento, sem PII nem ``client_secret``."""

    if not isinstance(payload, dict):
        return {"stored": False}
    slim: dict[str, Any] = {}
    for key in _WEBHOOK_TOP_KEYS:
        if key in payload:
            slim[key] = payload[key]
    data = payload.get("data")
    if isinstance(data, dict):
        obj = data.get("object") if isinstance(data.get("object"), dict) else data
        nested: dict[str, Any] = {}
        if isinstance(obj, dict):
            for key in _WEBHOOK_OBJECT_KEYS:
                if key in obj:
                    nested[key] = obj[key]
            meta = obj.get("metadata")
            if isinstance(meta, dict) and meta.get("order_id"):
                nested["order_id"] = str(meta["order_id"])
        slim["data"] = nested
    return slim


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
    """Registra o webhook do Mercado Pago, liquida pagamentos aprovados e concilia estornos,
    chargebacks e mediações.

    A view deve validar a assinatura com ``WebhookSignatureService`` antes de chamar
    ``execute``. O status vem sempre da consulta autenticada ao provedor, nunca do corpo do
    evento. Aprovações seguem por ``ApplyGatewayPaymentUseCase``; devoluções por
    ``ReconcilePaymentReversalUseCase``.
    """

    def __init__(
        self,
        logs: IWebhookLogRepository,
        gateways: IPaymentGatewayRegistry,
        apply: ApplyGatewayPaymentUseCase,
        orders: IPaymentOrderRepository,
        reversals: ReconcilePaymentReversalUseCase,
    ) -> None:
        self._logs = logs
        self._gateways = gateways
        self._apply = apply
        self._orders = orders
        self._reversals = reversals

    def execute(self, data: HandleMercadoPagoWebhookInput) -> None:
        payload = data.payload
        event_id = str(payload.get("id") or data.request_id or "")
        data_id = str((payload.get("data") or {}).get("id") or "")
        self._logs.create(kind="mercadopago", data_id=event_id or data_id, payload=sanitize_webhook_payload(payload))
        action = payload.get("action") or payload.get("type")
        if action in {"payment.created", "payment", "payment.updated"} and data_id:
            result = self._gateways.get("mercadopago").fetch_by_external_id(data_id)
            reversal = reversal_from_result("mercadopago", result)
            if reversal is not None:
                order = self._orders.get_by_external_id(result.external_id)
                if order is None:
                    logger.warning("Estorno Mercado Pago sem pedido conhecido: %s", result.external_id)
                    return
                kind, refunded_total, key = reversal
                self._reversals.execute(
                    ReconcilePaymentReversalInput(
                        order_id=order.id, event_key=key, kind=kind, refunded_total=refunded_total
                    )
                )
                return
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


_STRIPE_DISPUTE_OUTCOMES = {"won": "dispute_won", "lost": "dispute_lost"}


def _stripe_amount(cents: Any) -> Decimal:
    try:
        value = Decimal(str(cents or 0)) / 100
    except (InvalidOperation, ValueError):
        return Decimal(0)
    return value if value.is_finite() and value > 0 else Decimal(0)


class HandleStripeWebhookUseCase(UseCase[HandleStripeWebhookInput, None]):
    """Registra o webhook do Stripe, liquida pagamentos concluídos e concilia reembolsos e
    disputas.

    A view deve validar a assinatura com ``WebhookSignatureService`` antes de chamar
    ``execute``. Aplica o crédito via ``ApplyGatewayPaymentUseCase`` e as devoluções via
    ``ReconcilePaymentReversalUseCase``, localizando o pedido pelo PaymentIntent.
    """

    def __init__(
        self,
        logs: IWebhookLogRepository,
        apply: ApplyGatewayPaymentUseCase,
        orders: IPaymentOrderRepository,
        reversals: ReconcilePaymentReversalUseCase,
    ) -> None:
        self._logs = logs
        self._apply = apply
        self._orders = orders
        self._reversals = reversals

    def execute(self, data: HandleStripeWebhookInput) -> None:
        event = data.event
        self._logs.create(kind=event["type"], data_id=event["id"], payload=sanitize_webhook_payload(event))
        if self._reconcile(event):
            return
        if event["type"] in {"payment_intent.succeeded", "checkout.session.completed", "checkout.session.async_payment_succeeded"}:
            obj = event["data"]["object"]
            if event["type"] == "checkout.session.completed" and obj.get("payment_status") != "paid":
                return
            external_id = obj.get("id")
            metadata = obj.get("metadata") or {}
            order_id = None
            if metadata.get("order_id"):
                try:
                    order_id = UUID(str(metadata["order_id"]))
                except ValueError:
                    order_id = None
            intent = obj.get("payment_intent") if str(external_id or "").startswith("cs_") else None
            self._apply.execute(
                ApplyGatewayPaymentInput(
                    external_id=str(external_id or ""),
                    order_id=order_id,
                    approved=True,
                    aliases=(str(intent),) if intent else (),
                )
            )

    def _reconcile(self, event) -> bool:
        kind = None
        obj = event["data"]["object"]
        if event["type"] == "charge.refunded":
            kind, total = "refund", _stripe_amount(obj.get("amount_refunded"))
        elif event["type"] == "charge.dispute.created":
            kind, total = "dispute_opened", Decimal(0)
        elif event["type"] == "charge.dispute.closed":
            kind, total = _STRIPE_DISPUTE_OUTCOMES.get(str(obj.get("status") or "")), Decimal(0)
        if kind is None:
            return event["type"].startswith("charge.")
        intent = str(obj.get("payment_intent") or "")
        order = self._orders.get_by_external_id(intent) if intent else None
        if order is None:
            logger.warning("Evento Stripe %s sem pedido conhecido (payment_intent=%s)", event["type"], intent)
            return True
        # Reembolsos acumulados usam o total na chave: reenvios do mesmo estado não reaplicam.
        key = f"stripe:{intent}:refund:{total}" if kind == "refund" else f"stripe:{event['id']}"
        self._reversals.execute(
            ReconcilePaymentReversalInput(order_id=order.id, event_key=key, kind=kind, refunded_total=total)
        )
        return True
