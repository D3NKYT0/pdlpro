from django.contrib import admin

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
    EconomyFightLog,
    EconomyWeapon,
    Fish,
    FishingCatch,
    FishingRod,
    GameConfig,
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
    list_display = ("code", "name", "active")


@admin.register(Prize)
class PrizeAdmin(PDLModelAdmin):
    list_display = ("name", "item_id", "weight", "rarity", "active")


@admin.register(SpinHistory)
class SpinHistoryAdmin(PDLModelAdmin):
    list_display = ("user", "prize", "failed", "created_at")


@admin.register(Bag)
class BagAdmin(PDLModelAdmin):
    list_display = ("user", "created_at")


@admin.register(BagItem)
class BagItemAdmin(PDLModelAdmin):
    list_display = ("bag", "item_name", "quantity", "enchant")


@admin.register(DailyBonusClaim)
class DailyBonusClaimAdmin(PDLModelAdmin):
    list_display = ("user", "claimed_on", "amount")


@admin.register(CatalogItem)
class CatalogItemAdmin(PDLModelAdmin):
    list_display = ("name", "item_id", "rarity", "weight", "active")


@admin.register(BoxType)
class BoxTypeAdmin(PDLModelAdmin):
    list_display = ("name", "price", "boosters_amount", "active")
    filter_horizontal = ("items",)


@admin.register(Box)
class BoxAdmin(PDLModelAdmin):
    list_display = ("user", "box_type", "created_at")


@admin.register(BoxSlot)
class BoxSlotAdmin(PDLModelAdmin):
    list_display = ("box", "item_name", "rarity", "opened")


@admin.register(DiceHistory)
class DiceHistoryAdmin(PDLModelAdmin):
    list_display = ("user", "bet_type", "roll", "won", "payout")


@admin.register(SlotHistory)
class SlotHistoryAdmin(PDLModelAdmin):
    list_display = ("user", "reels", "won", "payout")


@admin.register(FishingRod)
class FishingRodAdmin(PDLModelAdmin):
    list_display = ("user", "level", "xp")


@admin.register(Fish)
class FishAdmin(PDLModelAdmin):
    list_display = ("name", "rarity", "min_rod_level", "weight", "active")


@admin.register(FishingCatch)
class FishingCatchAdmin(PDLModelAdmin):
    list_display = ("user", "fish", "success", "rod_level", "created_at")


@admin.register(EconomyWeapon)
class EconomyWeaponAdmin(PDLModelAdmin):
    list_display = ("user", "level", "fragments")


@admin.register(Monster)
class MonsterAdmin(PDLModelAdmin):
    list_display = ("name", "level", "required_weapon_level", "active")


@admin.register(EconomyFightLog)
class EconomyFightLogAdmin(PDLModelAdmin):
    list_display = ("user", "monster", "won", "fragments_earned")


@admin.register(BattlePassSeason)
class BattlePassSeasonAdmin(PDLModelAdmin):
    list_display = ("name", "starts_at", "ends_at", "active", "premium_price")


@admin.register(BattlePassLevel)
class BattlePassLevelAdmin(PDLModelAdmin):
    list_display = ("season", "level", "required_xp")


@admin.register(BattlePassReward)
class BattlePassRewardAdmin(PDLModelAdmin):
    list_display = ("level_row", "is_premium", "item_name", "quantity")


@admin.register(UserBattlePassProgress)
class UserBattlePassProgressAdmin(PDLModelAdmin):
    list_display = ("user", "season", "xp", "has_premium")


@admin.register(UserBattlePassClaim)
class UserBattlePassClaimAdmin(PDLModelAdmin):
    list_display = ("user", "reward", "created_at")
