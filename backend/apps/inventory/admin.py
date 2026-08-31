from django.contrib import admin

from apps.inventory.infrastructure.models import InventoryItem


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at")
