import uuid

from django.db import models


class BaseModel(models.Model):
    """
    Modelo base para recursos públicos do PDL PRO.

    `id` é UUID v4 exposto via API; `seq_id` é sequencial interno para banco/admin.
    """

    id = models.UUIDField(
        unique=True,
        default=uuid.uuid4,
        editable=False,
        help_text="Identificador público. Sempre UUID v4.",
    )
    seq_id = models.BigAutoField(
        primary_key=True,
        editable=False,
        help_text="ID sequencial interno. Nunca expor via API.",
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]


class InternalModel(models.Model):
    """Modelo base para recursos internos, logs e auditoria."""

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
