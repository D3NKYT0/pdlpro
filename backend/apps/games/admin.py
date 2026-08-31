from django.contrib import admin

from apps.games.infrastructure.models import (
    Bag,
    BagItem,
    Box,
    BoxSlot,
    BoxType,
    CatalogItem,
    DailyBonusClaim,
    DiceHistory,
    GameConfig,
    Prize,
    SlotHistory,
    SpinHistory,
)


@admin.register(GameConfig)
class GameConfigAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "active")


@admin.register(Prize)
class PrizeAdmin(admin.ModelAdmin):
    list_display = ("name", "item_id", "weight", "rarity", "active")


@admin.register(SpinHistory)
class SpinHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "prize", "failed", "created_at")


@admin.register(Bag)
class BagAdmin(admin.ModelAdmin):
    list_display = ("user", "created_at")


@admin.register(BagItem)
class BagItemAdmin(admin.ModelAdmin):
    list_display = ("bag", "item_name", "quantity", "enchant")


@admin.register(DailyBonusClaim)
class DailyBonusClaimAdmin(admin.ModelAdmin):
    list_display = ("user", "claimed_on", "amount")


@admin.register(CatalogItem)
class CatalogItemAdmin(admin.ModelAdmin):
    list_display = ("name", "item_id", "rarity", "weight", "active")


@admin.register(BoxType)
class BoxTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "boosters_amount", "active")
    filter_horizontal = ("items",)


@admin.register(Box)
class BoxAdmin(admin.ModelAdmin):
    list_display = ("user", "box_type", "created_at")


@admin.register(BoxSlot)
class BoxSlotAdmin(admin.ModelAdmin):
    list_display = ("box", "item_name", "rarity", "opened")


@admin.register(DiceHistory)
class DiceHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "bet_type", "roll", "won", "payout")


@admin.register(SlotHistory)
class SlotHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "reels", "won", "payout")
