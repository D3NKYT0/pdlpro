from django.contrib import admin

from apps.wallet.infrastructure.models import CoinConfig, Wallet, WalletTransaction


@admin.register(Wallet)
class WalletAdmin(admin.ModelAdmin):
    list_display = ("user", "balance", "bonus_balance", "updated_at")
    search_fields = ("user__username",)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(admin.ModelAdmin):
    list_display = ("wallet", "kind", "amount", "created_at")


@admin.register(CoinConfig)
class CoinConfigAdmin(admin.ModelAdmin):
    list_display = ("name", "coin_id", "multiplier", "active")
