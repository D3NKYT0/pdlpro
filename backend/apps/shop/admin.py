from django.contrib import admin

from apps.shop.infrastructure.models import ShopItem, ShopPackage, ShopPurchase
from common.admin import PDLModelAdmin


@admin.register(ShopItem)
class ShopItemAdmin(PDLModelAdmin):
    list_display = ("name", "item_id", "price", "quantity", "active")
    list_filter = ("active",)
    search_fields = ("name",)


@admin.register(ShopPackage)
class ShopPackageAdmin(PDLModelAdmin):
    list_display = ("name", "total_price", "active")


@admin.register(ShopPurchase)
class ShopPurchaseAdmin(PDLModelAdmin):
    list_display = ("user", "total", "status", "created_at")
