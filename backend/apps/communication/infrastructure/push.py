from __future__ import annotations

import json
import logging
from uuid import UUID

from django.conf import settings

from apps.communication.domain.push import IPushSender
from apps.communication.infrastructure.models import PushSubscription

logger = logging.getLogger(__name__)


class WebPushSender(IPushSender):
    def is_configured(self) -> bool:
        return bool(getattr(settings, "VAPID_PUBLIC_KEY", "") and getattr(settings, "VAPID_PRIVATE_KEY", ""))

    def public_key(self) -> str:
        return str(getattr(settings, "VAPID_PUBLIC_KEY", "") or "")

    def send(self, user_id: UUID, *, title: str, body: str, url: str = "") -> int:
        if not self.is_configured():
            return 0
        try:
            from pywebpush import WebPushException, webpush
        except ImportError:
            logger.warning("pywebpush não instalado; push ignorado.")
            return 0

        payload = json.dumps({"title": title, "body": body, "url": url or "/"})
        claims = {"sub": getattr(settings, "VAPID_SUBJECT", "mailto:noreply@localhost")}
        sent = 0
        for row in PushSubscription.objects.filter(user__id=user_id):
            try:
                webpush(
                    subscription_info={
                        "endpoint": row.endpoint,
                        "keys": {"auth": row.auth, "p256dh": row.p256dh},
                    },
                    data=payload,
                    vapid_private_key=settings.VAPID_PRIVATE_KEY,
                    vapid_claims=claims,
                )
                sent += 1
            except WebPushException:
                logger.info("Inscrição push inválida removida: %s", row.endpoint[:48])
                row.delete()
            except Exception:
                logger.exception("Falha ao enviar web push")
        return sent
