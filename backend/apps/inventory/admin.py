from django.contrib import admin

from apps.inventory.infrastructure.models import BlockedServerItem, Inventory, InventoryItem, InventoryLog
from common.admin import PDLModelAdmin


@admin.register(Inventory)
class InventoryAdmin(PDLModelAdmin):
    """Configura a administração Django de ``Inventory``.

    A listagem exibe ``user``, ``character_name``, ``account_name``, ``updated_at``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "character_name", "account_name", "updated_at")
    search_fields = ("character_name", "user__username")


@admin.register(InventoryItem)
class InventoryItemAdmin(PDLModelAdmin):
    """Configura a administração Django de ``InventoryItem``.

    A listagem exibe ``item_name``, ``item_id``, ``quantity``, ``enchant``, ``inventory``.
    Ajuste filtros, busca e campos nesta classe para mudar a experiência da equipe no admin;
    regras reutilizáveis ficam na aplicação.
    """

    list_display = ("item_name", "item_id", "quantity", "enchant", "inventory")


@admin.register(BlockedServerItem)
class BlockedServerItemAdmin(PDLModelAdmin):
    """Configura a administração Django de ``BlockedServerItem``.

    A listagem exibe ``item_id``, ``reason``. Ajuste filtros, busca e campos nesta classe para
    mudar a experiência da equipe no admin; regras reutilizáveis ficam na aplicação.
    """

    list_display = ("item_id", "reason")


@admin.register(InventoryLog)
class InventoryLogAdmin(PDLModelAdmin):
    """Configura a administração Django de ``InventoryLog``.

    A listagem exibe ``user``, ``action``, ``item_id``, ``quantity``, ``created_at``. Ajuste
    filtros, busca e campos nesta classe para mudar a experiência da equipe no admin; regras
    reutilizáveis ficam na aplicação.
    """

    list_display = ("user", "action", "item_id", "quantity", "created_at")
