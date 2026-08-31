from django.db import models

from common.models import BaseModel


class ClanProfile(BaseModel):
    name = models.CharField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    recruiting = models.BooleanField(default=True)
    owner = models.ForeignKey("accounts.User", on_delete=models.CASCADE, related_name="owned_clans")

    class Meta:
        verbose_name = "Clan"
        verbose_name_plural = "Clans"

