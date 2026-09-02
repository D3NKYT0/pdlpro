from django.conf import settings
from django.db import models

from common.models import BaseModel


class Notification(BaseModel):
    """Mensagem persistida na central de notificações, com destino e estado de leitura.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True)
    kind = models.CharField(max_length=40, default="info")
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ["-created_at"]


class PushSubscription(BaseModel):
    """Endpoint e chaves públicas da assinatura Web Push associada ao usuário.

    Relaciona os registros por ``user``. Herda BaseModel: use ``id`` (UUID) nas APIs;
    ``pk``/``seq_id`` são internos. Use os serviços de aplicação para operações de negócio,
    mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(max_length=500)
    auth = models.CharField(max_length=255)
    p256dh = models.CharField(max_length=255)

    class Meta:
        verbose_name = "Inscrição push"
        verbose_name_plural = "Inscrições push"
        unique_together = ("user", "endpoint")
