from django.contrib import admin

from apps.shop.infrastructure.models import ShopItem, ShopPackage, ShopPurchase
from common.admin import PDLModelAdmin


@admin.register(ShopItem)
class ShopItemAdmin(PDLModelAdmin):
    """Configura a administração Django de ``ShopItem``.

    A listagem exibe ``name``, ``item_id``, ``price``, ``quantity``, ``active``. Ajuste filtros,
    busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "item_id", "price", "quantity", "active")
    list_filter = ("active",)
    search_fields = ("name",)


@admin.register(ShopPackage)
class ShopPackageAdmin(PDLModelAdmin):
    """Configura a administração Django de ``ShopPackage``.

    A listagem exibe ``name``, ``total_price``, ``active``. Ajuste filtros, busca e campos nesta
    classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("name", "total_price", "active")


@admin.register(ShopPurchase)
class ShopPurchaseAdmin(PDLModelAdmin):
    """Configura a administração Django de ``ShopPurchase``.

    A listagem exibe ``user``, ``total``, ``status``, ``created_at``. Ajuste filtros, busca e
    campos nesta classe para mudar a experiência da equipe no admin; regras reutilizáveis ficam
    na aplicação.
    """

    list_display = ("user", "total", "status", "created_at")
