from __future__ import annotations

import json
import logging
from uuid import UUID

from django.conf import settings

from apps.communication.domain.push import IPushSender
from apps.communication.infrastructure.models import PushSubscription

logger = logging.getLogger(__name__)


class WebPushSender(IPushSender):
    """Adaptador de IPushSender para as assinaturas Web Push persistidas.

    Use ``is_configured`` e ``public_key`` para informar a disponibilidade ao cliente; ``send``
    entrega a mensagem às assinaturas do usuário conforme a configuração VAPID. O ciclo de
    inscrição é tratado pelos casos de uso de push, enquanto NotifyUser combina persistência e
    envio.
    """

    def is_configured(self) -> bool:
        return bool(getattr(settings, "VAPID_PUBLIC_KEY", "") and getattr(settings, "VAPID_PRIVATE_KEY", ""))

    def public_key(self) -> str:
        return str(getattr(settings, "VAPID_PUBLIC_KEY", "") or "")

    def send(self, user_id: UUID, *, title: str, body: str, url: str = "") -> int:
        """Envia às assinaturas do usuário e retorna a quantidade de envios concluídos.

        Sem configuração ou biblioteca, retorna zero. Remove a assinatura quando pywebpush lança
        WebPushException; outras falhas são registradas no log.
        """

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
