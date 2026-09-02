from django.contrib import admin

from apps.wallet.infrastructure.models import CoinConfig, CoinPackage, CoinPurchaseBonus, Wallet, WalletTransaction
from common.admin import PDLModelAdmin


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


@admin.register(CoinPurchaseBonus)
class CoinPurchaseBonusAdmin(PDLModelAdmin):
    """Configura a administração Django de ``CoinPurchaseBonus``.

    A listagem exibe ``description``, ``min_amount``, ``max_amount``, ``percent``, ``active``,
    ``order``. Ajuste filtros, busca e campos nesta classe para mudar a experiência da equipe no
    admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("description", "min_amount", "max_amount", "percent", "active", "order")
