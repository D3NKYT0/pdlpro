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


class CatalogItem(BaseModel):
    name = models.CharField(max_length=120)
    item_id = models.PositiveIntegerField()
    enchant = models.PositiveIntegerField(default=0)
    rarity = models.CharField(max_length=20, default="common")
    weight = models.PositiveIntegerField(default=10)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Item de catálogo"
        verbose_name_plural = "Itens de catálogo"

    def __str__(self) -> str:
        return f"{self.name} +{self.enchant}"


class BoxType(BaseModel):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=12, decimal_places=2)
    boosters_amount = models.PositiveIntegerField(default=5)
    active = models.BooleanField(default=True)
    items = models.ManyToManyField(CatalogItem, blank=True, related_name="box_types")

    class Meta:
        verbose_name = "Tipo de caixa"
        verbose_name_plural = "Tipos de caixa"

    def __str__(self) -> str:
        return self.name


class Box(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_boxes")
    box_type = models.ForeignKey(BoxType, on_delete=models.CASCADE, related_name="boxes")

    class Meta:
        verbose_name = "Caixa"
        verbose_name_plural = "Caixas"


class BoxSlot(BaseModel):
    box = models.ForeignKey(Box, on_delete=models.CASCADE, related_name="slots")
    item_id = models.PositiveIntegerField()
    item_name = models.CharField(max_length=120)
    enchant = models.PositiveIntegerField(default=0)
    rarity = models.CharField(max_length=20, default="common")
    probability = models.PositiveIntegerField(default=1)
    opened = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Booster da caixa"


class DiceHistory(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dice_plays")
    bet_type = models.CharField(max_length=20)
    bet_amount = models.PositiveIntegerField()
    roll = models.PositiveIntegerField()
    won = models.BooleanField(default=False)
    payout = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Jogada de dados"


class SlotHistory(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="slot_plays")
    reels = models.JSONField(default=list)
    won = models.BooleanField(default=False)
    payout = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Giro de slots"
