from decimal import Decimal

from django.conf import settings
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


class Prize(BaseModel):
    name = models.CharField(max_length=120)
    item_id = models.PositiveIntegerField(default=0)
    enchant = models.PositiveIntegerField(default=0)
    weight = models.PositiveIntegerField(default=1)
    rarity = models.CharField(max_length=20, default="comum")
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Prêmio da roleta"
        verbose_name_plural = "Prêmios da roleta"


class SpinHistory(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="spins")
    prize = models.ForeignKey(Prize, on_delete=models.SET_NULL, null=True, blank=True)
    failed = models.BooleanField(default=False)
    seed = models.BigIntegerField(default=0)

    class Meta:
        verbose_name = "Giro da roleta"
        verbose_name_plural = "Giros da roleta"


class Bag(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_bag")

    class Meta:
        verbose_name = "Bag"
        verbose_name_plural = "Bags"


class BagItem(BaseModel):
    bag = models.ForeignKey(Bag, on_delete=models.CASCADE, related_name="items")
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=120)
    quantity = models.PositiveIntegerField(default=1)
    enchant = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Item da bag"
        unique_together = ("bag", "item_id", "enchant")


class DailyBonusClaim(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_bonus_claims")
    claimed_on = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0.00"))

    class Meta:
        verbose_name = "Resgate de bônus diário"
        unique_together = ("user", "claimed_on")
