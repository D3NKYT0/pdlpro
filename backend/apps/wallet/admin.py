from django.contrib import admin

from apps.wallet.infrastructure.models import CoinConfig, CoinPackage, CoinPurchaseBonus, Wallet, WalletTransaction
from common.admin import PDLModelAdmin


@admin.register(Wallet)
class WalletAdmin(PDLModelAdmin):
    list_display = ("user", "balance", "bonus_balance", "updated_at")
    search_fields = ("user__username",)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(PDLModelAdmin):
    list_display = ("wallet", "kind", "amount", "created_at")


@admin.register(CoinConfig)
class CoinConfigAdmin(PDLModelAdmin):
    list_display = ("name", "coin_id", "multiplier", "usd_multiplier", "active")


@admin.register(CoinPackage)
class CoinPackageAdmin(PDLModelAdmin):
    list_display = ("code", "name", "coins", "price_brl", "price_usd", "active", "sort_order")


@admin.register(CoinPurchaseBonus)
class CoinPurchaseBonusAdmin(PDLModelAdmin):
    list_display = ("description", "min_amount", "max_amount", "percent", "active", "order")
