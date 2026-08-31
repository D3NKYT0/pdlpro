from django.db import models

from common.models import InternalModel


class AuditLog(InternalModel):
    action = models.CharField(max_length=80)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Log de auditoria"
        verbose_name_plural = "Logs de auditoria"
