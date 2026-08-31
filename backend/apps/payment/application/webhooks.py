from __future__ import annotations

import hashlib
import hmac
import json
import logging
import urllib.parse

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class WebhookSignatureService:
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
