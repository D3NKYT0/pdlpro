from django.contrib import admin

from apps.games.infrastructure.models import Bag, BagItem, DailyBonusClaim, GameConfig, Prize, SpinHistory


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
