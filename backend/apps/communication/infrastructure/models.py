from django.db import models

from common.models import BaseModel


class Notification(BaseModel):
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"

