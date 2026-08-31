from django.db import models

from common.models import BaseModel


class GameConfig(BaseModel):
    code = models.CharField(max_length=40, unique=True)
    name = models.CharField(max_length=80)
    active = models.BooleanField(default=True)
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Configuração de jogo"
        verbose_name_plural = "Configurações de jogos"

