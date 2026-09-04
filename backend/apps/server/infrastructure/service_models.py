from typing import ClassVar

from django.conf import settings
from django.db import models

from common.models import BaseModel


class CharacterServiceOperation(BaseModel):
    """Reserva durável de um serviço pago; resultados incertos exigem conciliação da equipe.

    A chave é única por usuário. Pending bloqueia novas operações no mesmo personagem até
    confirmação ou estorno explícito. Nunca reaplique automaticamente uma chamada incerta.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    request_key = models.UUIDField()
    login = models.CharField(max_length=45)
    character_id = models.PositiveIntegerField()
    service = models.CharField(max_length=30)
    value = models.CharField(max_length=16)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=12,
        default="pending",
        choices=[
            ("pending", "Pendente"),
            ("completed", "Concluído"),
            ("rejected", "Estornado"),
        ],
    )
    resolution_note = models.TextField(blank=True)

    class Meta:
        verbose_name = "Operação de serviço"
        verbose_name_plural = "Operações de serviço"
        constraints: ClassVar = [
            models.UniqueConstraint(
                fields=["user", "request_key"], name="pdl_character_service_key"
            )
        ]
