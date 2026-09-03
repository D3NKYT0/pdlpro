from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.models import InternalModel


class AuditLog(InternalModel):
    """Append-only audit trail for mutating staff API operations.

    It deliberately stores request metadata instead of request bodies, cookies or credentials.
    Retention is managed by ``prune_observability_logs``.
    """

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="staff_audit_logs",
    )
    action = models.CharField(max_length=80)
    request_id = models.CharField(max_length=128, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    method = models.CharField(max_length=8, blank=True)
    path = models.CharField(max_length=500, blank=True)
    status_code = models.PositiveSmallIntegerField(default=0)
    target_type = models.CharField(max_length=120, blank=True)
    target_id = models.CharField(max_length=120, blank=True)
    payload = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Log de auditoria"
        verbose_name_plural = "Logs de auditoria"

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Logs de auditoria são imutáveis.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Logs de auditoria só podem ser removidos pela política de retenção.")
