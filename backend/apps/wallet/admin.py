from django.contrib import admin

from apps.wallet.infrastructure.models import (
    CoinConfig,
    CoinPackage,
    CoinPackagePrice,
    CoinPurchaseBonus,
    CoinPurchasePromo,
    Wallet,
    WalletChargeCurrency,
    WalletTransaction,
)
from common.admin import PDLModelAdmin, PDLTabularInline


class CoinPackagePriceInline(PDLTabularInline):
    """Edição em linha de preços por moeda de cobrança."""

    model = CoinPackagePrice
    extra = 1
    fields = ("currency_code", "amount", "updated_at")
    readonly_fields = ("updated_at",)


@admin.register(Wallet)
class WalletAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Wallet``.

    A listagem exibe ``user``, ``balance``, ``bonus_balance``, ``updated_at``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "balance", "bonus_balance", "updated_at")
    search_fields = ("user__username",)


@admin.register(WalletTransaction)
class WalletTransactionAdmin(PDLModelAdmin):
    """Configura a administração Django de ``WalletTransaction``.

    A listagem exibe ``wallet``, ``kind``, ``amount``, ``created_at``. Ajuste filtros, busca e
    campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam
    na aplicação.
    """

    list_display = ("wallet", "kind", "amount", "created_at")


@admin.register(CoinConfig)
class CoinConfigAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CoinConfig``.

    A listagem exibe ``name``, ``coin_id``, ``multiplier``, ``usd_multiplier``, ``active``.
    Ajuste filtros, busca e campos nesta classe para mudar a experiência da equipe no admin;
    regras reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "coin_id", "multiplier", "usd_multiplier", "active")


@admin.register(CoinPackage)
class CoinPackageAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CoinPackage``.

    A listagem exibe ``code``, ``name``, ``coins``, ``price_brl``, ``price_usd``, ``active``,
    ``sort_order``. Ajuste filtros, busca e campos nesta classe para mudar a experiência da
    equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("code", "name", "coins", "price_brl", "price_usd", "active", "sort_order")
    inlines = [CoinPackagePriceInline]


@admin.register(WalletChargeCurrency)
class WalletChargeCurrencyAdmin(PDLModelAdmin):
    """Configura a administração Django de ``WalletChargeCurrency``.

    A listagem exibe ``code``, ``coins_per_unit``, ``sort_order``,
    ``settlement``, ``enabled``, ``updated_at``.
    """

    list_display = (
        "code",
        "coins_per_unit",
        "sort_order",
        "settlement",
        "enabled",
        "updated_at",
    )
    list_filter = ("enabled", "settlement")
    search_fields = ("code",)


@admin.register(CoinPackagePrice)
class CoinPackagePriceAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CoinPackagePrice``.

    A listagem exibe ``package``, ``currency_code``, ``amount``, ``updated_at``.
    """

    list_display = ("package", "currency_code", "amount", "updated_at")
    list_filter = ("currency_code",)
    search_fields = ("package__code", "package__name", "currency_code")


@admin.register(CoinPurchaseBonus)
class CoinPurchaseBonusAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CoinPurchaseBonus``.

    A listagem exibe ``description``, ``min_amount``, ``max_amount``, ``percent``, ``active``,
    ``order``. Ajuste filtros, busca e campos nesta classe para mudar a experiência da equipe no
    admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("description", "min_amount", "max_amount", "percent", "active", "order")


@admin.register(CoinPurchasePromo)
class CoinPurchasePromoAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CoinPurchasePromo``.

    A listagem exibe ``title``, ``percent``, ``active``, ``starts_at``, ``ends_at``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("title", "percent", "active", "starts_at", "ends_at", "updated_at")
    list_filter = ("active",)
    search_fields = ("title", "description")
