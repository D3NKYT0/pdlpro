from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.games.infrastructure.models import (
    Bag,
    BagItem,
    BattlePassLevel,
    BattlePassReward,
    BattlePassSeason,
    Box,
    BoxSlot,
    BoxType,
    CatalogItem,
    DailyBonusClaim,
    DiceHistory,
    EconomyBossDuel,
    EconomyFightLog,
    EconomyWeapon,
    Fish,
    FishingBait,
    FishingCatch,
    FishingRod,
    GameConfig,
    HuntClaim,
    HuntQuest,
    HuntSnapshot,
    Monster,
    Prize,
    SlotHistory,
    SpinHistory,
    UserBattlePassClaim,
    UserBattlePassProgress,
)
from common.admin import PDLModelAdmin


@admin.register(GameConfig)
class GameConfigAdmin(PDLModelAdmin):
    """Configura a administração Django de ``GameConfig``.

    A listagem exibe ``code``, ``name``, ``active``. Ajuste filtros, busca e campos nesta classe
    para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("code", "name", "active")


@admin.register(Prize)
class PrizeAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Prize``.

    A listagem exibe ``name``, ``item_id``, ``weight``, ``rarity``, ``active``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "item_id", "quantity", "weight", "rarity", "active")


@admin.register(SpinHistory)
class SpinHistoryAdmin(PDLModelAdmin):
    """Configura a administração Django de ``SpinHistory``.

    A listagem exibe ``user``, ``prize``, ``failed``, ``created_at``. Ajuste filtros, busca e
    campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam
    na aplicação.
    """

    list_display = ("user", "prize", "failed", "created_at")


@admin.register(Bag)
class BagAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Bag``.

    A listagem exibe ``user``, ``created_at``. Ajuste filtros, busca e campos nesta classe para
    mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "created_at")


@admin.register(BagItem)
class BagItemAdmin(PDLModelAdmin):
    """Configura a administração Django de ``BagItem``.

    A listagem exibe ``bag``, ``item_name``, ``quantity``, ``enchant``. Ajuste filtros, busca e
    campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam
    na aplicação.
    """

    list_display = ("bag", "item_name", "quantity", "enchant")


@admin.register(DailyBonusClaim)
class DailyBonusClaimAdmin(PDLModelAdmin):
    """Configura a administração Django de ``DailyBonusClaim``.

    A listagem exibe ``user``, ``claimed_on``, ``amount``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "claimed_on", "amount")


@admin.register(CatalogItem)
class CatalogItemAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CatalogItem``.

    A listagem exibe ``name``, ``item_id``, ``rarity``, ``weight``, ``active``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "item_id", "quantity", "rarity", "weight", "active")


@admin.register(BoxType)
class BoxTypeAdmin(PDLModelAdmin):
    """Configura a administração Django de ``BoxType``.

    A listagem exibe ``name``, ``price``, ``boosters_amount``, ``active``. Ajuste filtros, busca
    e campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis
    ficam na aplicação.
    """

    list_display = ("name", "price", "boosters_amount", "active")
    filter_horizontal = ("items",)


@admin.register(Box)
class BoxAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Box``.

    A listagem exibe ``user``, ``box_type``, ``created_at``. Ajuste filtros, busca e campos
    nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na
    aplicação.
    """

    list_display = ("user", "box_type", "created_at")


@admin.register(BoxSlot)
class BoxSlotAdmin(PDLModelAdmin):
    """Configura a administração Django de ``BoxSlot``.

    A listagem exibe ``box``, ``item_name``, ``rarity``, ``opened``. Ajuste filtros, busca e
    campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam
    na aplicação.
    """

    list_display = ("box", "item_name", "rarity", "opened")


@admin.register(DiceHistory)
class DiceHistoryAdmin(PDLModelAdmin):
    """Configura a administração Django de ``DiceHistory``.

    A listagem exibe ``user``, ``bet_type``, ``roll``, ``won``, ``payout``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "bet_type", "roll", "won", "payout")


@admin.register(SlotHistory)
class SlotHistoryAdmin(PDLModelAdmin):
    """Configura a administração Django de ``SlotHistory``.

    A listagem exibe ``user``, ``reels``, ``won``, ``payout``. Ajuste filtros, busca e campos
    nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na
    aplicação.
    """

    list_display = ("user", "reels", "won", "payout")


@admin.register(FishingRod)
class FishingRodAdmin(PDLModelAdmin):
    """Configura a administração Django de ``FishingRod``.

    A listagem exibe ``user``, ``level``, ``xp``. Ajuste filtros, busca e campos nesta classe
    para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "level", "xp")


@admin.register(Fish)
class FishAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Fish``.

    A listagem exibe ``name``, ``rarity``, ``min_rod_level``, ``weight``, ``active``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "rarity", "item_id", "quantity", "min_rod_level", "weight", "active")
    search_fields = ("name", "name_en", "name_es")
    fieldsets = (
        (_("Português"), {"fields": ("name",)}),
        (_("English"), {"fields": ("name_en",)}),
        (_("Español"), {"fields": ("name_es",)}),
        (
            _("Regras"),
            {
                "fields": (
                    "rarity",
                    "min_rod_level",
                    "weight",
                    "xp_reward",
                    "fichas_reward",
                    "item_id",
                    "item_name",
                    "enchant",
                    "quantity",
                    "active",
                )
            },
        ),
    )


@admin.register(FishingBait)
class FishingBaitAdmin(PDLModelAdmin):
    """Administração das iscas com camadas PT/EN/ES."""

    list_display = ("name", "paid_with", "price", "success_bonus", "active")
    list_filter = ("paid_with", "active")
    search_fields = ("name", "name_en", "name_es", "description")
    fieldsets = (
        (_("Português"), {"fields": ("name", "description")}),
        (_("English"), {"fields": ("name_en", "description_en")}),
        (_("Español"), {"fields": ("name_es", "description_es")}),
        (_("Regras"), {"fields": ("paid_with", "price", "success_bonus", "active")}),
    )


@admin.register(FishingCatch)
class FishingCatchAdmin(PDLModelAdmin):
    """Configura a administração Django de ``FishingCatch``.

    A listagem exibe ``user``, ``fish``, ``success``, ``rod_level``, ``created_at``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "fish", "success", "rod_level", "created_at")


@admin.register(EconomyWeapon)
class EconomyWeaponAdmin(PDLModelAdmin):
    """Configura a administração Django de ``EconomyWeapon``.

    A listagem exibe ``user``, ``level``, ``fragments``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "level", "fragments")


@admin.register(EconomyBossDuel)
class EconomyBossDuelAdmin(PDLModelAdmin):
    """Configura a administração Django de ``EconomyBossDuel``.

    A listagem exibe ``user``, ``monster``, ``round``, ``player_hp``, ``boss_hp``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "monster", "round", "player_hp", "boss_hp")


@admin.register(Monster)
class MonsterAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Monster``.

    A listagem exibe ``name``, ``level``, ``required_weapon_level``, ``active``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "level", "required_weapon_level", "is_boss", "active")


@admin.register(EconomyFightLog)
class EconomyFightLogAdmin(PDLModelAdmin):
    """Configura a administração Django de ``EconomyFightLog``.

    A listagem exibe ``user``, ``monster``, ``won``, ``fragments_earned``. Ajuste filtros, busca
    e campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis
    ficam na aplicação.
    """

    list_display = ("user", "monster", "won", "fragments_earned")


@admin.register(BattlePassSeason)
class BattlePassSeasonAdmin(PDLModelAdmin):
    """Configura a administração Django de ``BattlePassSeason``.

    A listagem exibe ``name``, ``starts_at``, ``ends_at``, ``active``, ``premium_price``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "starts_at", "ends_at", "active", "premium_price")


@admin.register(BattlePassLevel)
class BattlePassLevelAdmin(PDLModelAdmin):
    """Configura a administração Django de ``BattlePassLevel``.

    A listagem exibe ``season``, ``level``, ``required_xp``. Ajuste filtros, busca e campos
    nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na
    aplicação.
    """

    list_display = ("season", "level", "required_xp")


@admin.register(BattlePassReward)
class BattlePassRewardAdmin(PDLModelAdmin):
    """Configura a administração Django de ``BattlePassReward``.

    A listagem exibe ``level_row``, ``is_premium``, ``item_name``, ``quantity``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("level_row", "is_premium", "item_name", "quantity")


@admin.register(UserBattlePassProgress)
class UserBattlePassProgressAdmin(PDLModelAdmin):
    """Configura a administração Django de ``UserBattlePassProgress``.

    A listagem exibe ``user``, ``season``, ``xp``, ``has_premium``. Ajuste filtros, busca e
    campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam
    na aplicação.
    """

    list_display = ("user", "season", "xp", "has_premium")


@admin.register(UserBattlePassClaim)
class UserBattlePassClaimAdmin(PDLModelAdmin):
    """Configura a administração Django de ``UserBattlePassClaim``.

    A listagem exibe ``user``, ``reward``, ``created_at``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "reward", "created_at")


@admin.register(HuntQuest)
class HuntQuestAdmin(PDLModelAdmin):
    """Configura a administração Django de ``HuntQuest``."""

    list_display = ("name", "metric", "target", "period", "active")
    search_fields = ("name", "name_en", "name_es")
    list_filter = ("metric", "period", "active")
    fieldsets = (
        (None, {"fields": ("name", "description", "metric", "target", "period", "rewards", "active")}),
        (_("English"), {"fields": ("name_en", "description_en")}),
        (_("Español"), {"fields": ("name_es", "description_es")}),
    )


@admin.register(HuntSnapshot)
class HuntSnapshotAdmin(PDLModelAdmin):
    """Configura a administração Django de ``HuntSnapshot``."""

    list_display = ("user", "login", "character_id", "period_start")


@admin.register(HuntClaim)
class HuntClaimAdmin(PDLModelAdmin):
    """Configura a administração Django de ``HuntClaim``."""

    list_display = ("user", "quest", "character_id", "period_start")
