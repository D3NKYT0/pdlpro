from django.db import models

from common.models import InternalModel


class AuditLog(InternalModel):
    """Registro de auditoria das ações administrativas do painel. Use os serviços de aplicação para
    operações de negócio, mantendo neste modelo as regras de persistência e os relacionamentos.
    """

    action = models.CharField(max_length=80)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Log de auditoria"
        verbose_name_plural = "Logs de auditoria"
