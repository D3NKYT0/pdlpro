from django.conf import settings
from django.db import models

from common.models import BaseModel


class ClanProfile(BaseModel):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    recruiting = models.BooleanField(default=True)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="owned_clans")
    clan_id = models.PositiveIntegerField(null=True, blank=True, unique=True)
    motd = models.TextField(blank=True)
    focus = models.CharField(max_length=20, default="MIXED")
    min_level = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Clan"
        verbose_name_plural = "Clans"


class ClanApplication(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pendente"
        APPROVED = "approved", "Aprovado"
        REJECTED = "rejected", "Rejeitado"

    clan = models.ForeignKey(ClanProfile, on_delete=models.CASCADE, related_name="applications")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="clan_applications")
    char_name = models.CharField(max_length=100)
    message = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    class Meta:
        verbose_name = "Inscrição de clã"
        verbose_name_plural = "Inscrições de clã"
        unique_together = ("clan", "user")
