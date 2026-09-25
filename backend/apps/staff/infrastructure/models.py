from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.models import BaseModel, InternalModel


class IntegrationSettings(BaseModel):
    """Singleton com blobs Fernet das seções de integração (pagamentos, L2, SMTP, OAuth)."""

    payments_blob = models.TextField(blank=True, default="")
    lineage_blob = models.TextField(blank=True, default="")
    smtp_blob = models.TextField(blank=True, default="")
    oauth_blob = models.TextField(blank=True, default="")
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="integration_settings_updates",
    )

    class Meta:
        verbose_name = _("Configuração de integrações")
        verbose_name_plural = _("Configurações de integrações")

    def save(self, *args, **kwargs):
        self.pk = 1
        return super().save(*args, **kwargs)


class SecretRotationJob(BaseModel):
    """Pedido auditável de rotação/prune/reencrypt de segredos operacionais."""

    class Kind(models.TextChoices):
        ROTATE_SECRET = "rotate_secret_key", _("Rotacionar SECRET_KEY")
        PRUNE_SECRET = "prune_secret_fallbacks", _("Remover fallbacks da SECRET_KEY")
        ROTATE_DATA = "rotate_data_encryption_key", _("Rotacionar cifra de dados")
        PRUNE_DATA = "prune_data_fallbacks", _("Remover fallbacks da cifra de dados")
        ROTATE_BACKUP = "rotate_backup_encryption_key", _("Rotacionar chave de backup")
        REENCRYPT = "reencrypt_sealed_data", _("Regravar dados cifrados")
        REVOKE_SESSIONS = "revoke_all_sessions", _("Revogar todas as sessões JWT")

    class Status(models.TextChoices):
        PENDING = "pending", _("Pendente")
        APPLIED = "applied", _("Aplicado")
        FAILED = "failed", _("Falhou")
        CANCELLED = "cancelled", _("Cancelado")

    kind = models.CharField(max_length=64, choices=Kind.choices, db_index=True)
    status = models.CharField(
        max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True
    )
    source = models.CharField(max_length=32, default="panel")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="secret_rotation_jobs",
    )
    confirmation_domain = models.CharField(max_length=120, blank=True, default="")
    result = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")
    restart_required = models.BooleanField(default=False)
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _("Job de rotação de segredo")
        verbose_name_plural = _("Jobs de rotação de segredos")
        ordering = ("-created_at",)


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
        verbose_name=_("Log de auditoria")
        verbose_name_plural=_("Logs de auditoria")

    def save(self, *args, **kwargs):
        if self.pk:
            raise ValidationError("Logs de auditoria são imutáveis.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Logs de auditoria só podem ser removidos pela política de retenção.")
