from django.conf import settings
from django.db import models

from common.models import BaseModel


class GameExchange(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT)
    request_key = models.UUIDField()
    direction = models.CharField(
        max_length=10,
        choices=[("to_game", "Enviar ao jogo"), ("from_game", "Retirar do jogo")],
    )
    login = models.CharField(max_length=45)
    character_id = models.PositiveIntegerField()
    character_name = models.CharField(max_length=100)
    item_id = models.PositiveIntegerField()
    quantity = models.PositiveBigIntegerField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default="pending")
    error = models.CharField(max_length=300, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "request_key"], name="unique_game_exchange_request"
            )
        ]
