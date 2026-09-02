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


class FishingRod(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fishing_rod")
    level = models.PositiveIntegerField(default=1)
    xp = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Vara de pesca"


class Fish(BaseModel):
    name = models.CharField(max_length=80)
    rarity = models.CharField(max_length=20, default="common")
    min_rod_level = models.PositiveIntegerField(default=1)
    weight = models.PositiveIntegerField(default=10)
    xp_reward = models.PositiveIntegerField(default=10)
    fichas_reward = models.PositiveIntegerField(default=0)
    item_id = models.PositiveIntegerField(default=0)
    item_name = models.CharField(max_length=120, blank=True)
    enchant = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Peixe"


class FishingCatch(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="fishing_catches")
    fish = models.ForeignKey(Fish, on_delete=models.SET_NULL, null=True, blank=True)
    success = models.BooleanField(default=False)
    rod_level = models.PositiveIntegerField(default=1)

    class Meta:
        verbose_name = "Pescaria"


class EconomyWeapon(BaseModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="economy_weapon")
    level = models.PositiveIntegerField(default=0)
    fragments = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Arma da economia"


class Monster(BaseModel):
    name = models.CharField(max_length=80)
    level = models.PositiveIntegerField(default=1)
    required_weapon_level = models.PositiveIntegerField(default=0)
    fragment_reward = models.PositiveIntegerField(default=3)
    hp = models.PositiveIntegerField(default=40)
    attack = models.PositiveIntegerField(default=8)
    defense = models.PositiveIntegerField(default=2)
    respawn_seconds = models.PositiveIntegerField(default=30)
    defeated_at = models.DateTimeField(null=True, blank=True)
    active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Monstro"


class EconomyFightLog(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="economy_fights")
    monster = models.ForeignKey(Monster, on_delete=models.SET_NULL, null=True)
    won = models.BooleanField(default=False)
    rounds = models.PositiveIntegerField(default=0)
    fragments_earned = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Combate da economia"


class BattlePassSeason(BaseModel):
    name = models.CharField(max_length=80)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    active = models.BooleanField(default=True)
    premium_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("50.00"))

    class Meta:
        verbose_name = "Temporada do passe"


class BattlePassLevel(BaseModel):
    season = models.ForeignKey(BattlePassSeason, on_delete=models.CASCADE, related_name="levels")
    level = models.PositiveIntegerField()
    required_xp = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Nível do passe"
        unique_together = ("season", "level")
        ordering = ["level"]


class BattlePassReward(BaseModel):
    level_row = models.ForeignKey(BattlePassLevel, on_delete=models.CASCADE, related_name="rewards")
    is_premium = models.BooleanField(default=False)
    item_id = models.PositiveIntegerField(default=57)
    item_name = models.CharField(max_length=120, default="Adena")
    enchant = models.PositiveIntegerField(default=0)
    quantity = models.PositiveIntegerField(default=1)
    description = models.CharField(max_length=200, blank=True)

    class Meta:
        verbose_name = "Recompensa do passe"


class UserBattlePassProgress(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="battle_passes")
    season = models.ForeignKey(BattlePassSeason, on_delete=models.CASCADE, related_name="progress")
    xp = models.PositiveIntegerField(default=0)
    has_premium = models.BooleanField(default=False)
    auto_claim = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Progresso do passe"
        unique_together = ("user", "season")


class UserBattlePassClaim(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="battle_pass_claims")
    reward = models.ForeignKey(BattlePassReward, on_delete=models.CASCADE, related_name="claims")

    class Meta:
        verbose_name = "Resgate do passe"
        unique_together = ("user", "reward")


class BattlePassQuest(BaseModel):
    season = models.ForeignKey(BattlePassSeason, on_delete=models.CASCADE, related_name="quests")
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=300, blank=True)
    event = models.CharField(max_length=20, choices=[(s, s) for s in ("roulette", "dice", "slots", "fishing", "economy", "daily_bonus")])
    target = models.PositiveIntegerField(default=1)
    xp = models.PositiveIntegerField(default=25)
    period = models.CharField(max_length=10, choices=[("daily", "Diária"), ("weekly", "Semanal"), ("season", "Temporada")], default="daily")
    active = models.BooleanField(default=True)


class BattlePassQuestClaim(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    quest = models.ForeignKey(BattlePassQuest, on_delete=models.PROTECT)
    period_start = models.DateField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "quest", "period_start"], name="unique_quest_period_claim")]


class BattlePassExchange(BaseModel):
    season = models.ForeignKey(BattlePassSeason, on_delete=models.CASCADE, related_name="exchanges")
    name = models.CharField(max_length=120)
    required_item_id = models.PositiveIntegerField()
    required_enchant = models.PositiveIntegerField(default=0)
    required_quantity = models.PositiveIntegerField(default=1)
    rewards = models.JSONField(default=list)
    limit_per_user = models.PositiveIntegerField(default=1)
    active = models.BooleanField(default=True)


class BattlePassMilestone(BaseModel):
    season = models.ForeignKey(BattlePassSeason, on_delete=models.CASCADE, related_name="milestones")
    name = models.CharField(max_length=120)
    required_xp = models.PositiveIntegerField()
    rewards = models.JSONField(default=list)


class GameRewardLog(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    season = models.ForeignKey(BattlePassSeason, on_delete=models.SET_NULL, null=True, blank=True)
    kind = models.CharField(max_length=30)
    source = models.UUIDField(null=True, blank=True)
    label = models.CharField(max_length=200)
    rewards = models.JSONField(default=list)


class DailyBonusSeason(BaseModel):
    name = models.CharField(max_length=100)
    starts_on = models.DateField()
    ends_on = models.DateField()
    active = models.BooleanField(default=True)


class DailyBonusDay(BaseModel):
    season = models.ForeignKey(DailyBonusSeason, on_delete=models.CASCADE, related_name="days")
    day = models.PositiveIntegerField()
    rewards = models.JSONField(default=list)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["season", "day"], name="unique_daily_season_day")]
        ordering = ["day"]


class DailyBonusPoolEntry(BaseModel):
    season = models.ForeignKey(DailyBonusSeason, on_delete=models.CASCADE, related_name="pool")
    name = models.CharField(max_length=100)
    weight = models.PositiveIntegerField(default=1)
    rewards = models.JSONField(default=list)


class FishingBait(BaseModel):
    name = models.CharField(max_length=100)
    description = models.CharField(max_length=250, blank=True)
    price = models.PositiveIntegerField(default=1)
    success_bonus = models.PositiveIntegerField(default=5)
    active = models.BooleanField(default=True)


class UserFishingBait(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    bait = models.ForeignKey(FishingBait, on_delete=models.PROTECT)
    quantity = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "bait"], name="unique_user_bait")]
