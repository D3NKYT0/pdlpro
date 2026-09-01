from django.contrib import admin

from apps.inventory.infrastructure.models import BlockedServerItem, Inventory, InventoryItem, InventoryLog
from common.admin import PDLModelAdmin


@admin.register(Inventory)
class InventoryAdmin(PDLModelAdmin):
    list_display = ("user", "character_name", "account_name", "updated_at")
    search_fields = ("character_name", "user__username")


@admin.register(InventoryItem)
class InventoryItemAdmin(PDLModelAdmin):
    list_display = ("item_name", "item_id", "quantity", "enchant", "inventory")


@admin.register(BlockedServerItem)
class BlockedServerItemAdmin(PDLModelAdmin):
    list_display = ("item_id", "reason")


@admin.register(InventoryLog)
class InventoryLogAdmin(PDLModelAdmin):
    list_display = ("user", "action", "item_id", "quantity", "created_at")
