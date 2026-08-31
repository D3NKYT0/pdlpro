from django.contrib import admin

from apps.wallet.infrastructure.models import CoinConfig, CoinPackage, CoinPurchaseBonus, Wallet, WalletTransaction


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "balance", "bonus_balance", "updated_at")
    search_fields = ("user__username",)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("wallet", "kind", "amount", "created_at")


@admin.register(CoinConfig)
class CoinConfigAdmin(admin.ModelAdmin):
    list_display = ("name", "coin_id", "multiplier", "usd_multiplier", "active")


@admin.register(CoinPackage)
class CoinPackageAdmin(admin.ModelAdmin):
    list_display = ("code", "name", "coins", "price_brl", "price_usd", "active", "sort_order")


@admin.register(CoinPurchaseBonus)
class CoinPurchaseBonusAdmin(admin.ModelAdmin):
    list_display = ("description", "min_amount", "max_amount", "percent", "active", "order")
