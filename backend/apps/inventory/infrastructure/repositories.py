from __future__ import annotations

from uuid import UUID

from apps.inventory.domain.entities import InventoryEntity, InventoryItemEntity
from apps.inventory.domain.exceptions import InsufficientItemQuantityError
from apps.inventory.domain.repositories import IInventoryRepository
from apps.inventory.infrastructure.models import BlockedServerItem, Inventory, InventoryItem, InventoryLog
from apps.server.infrastructure.lineage.item_catalog import item_is_tradeable


class DjangoInventoryRepository(IInventoryRepository):
    def _inventory(self, row: Inventory) -> InventoryEntity:
        return InventoryEntity(
            id=row.id,
            user_id=row.user.id,
            character_name=row.character_name,
            account_name=row.account_name,
        )

    def _item(self, row: InventoryItem) -> InventoryItemEntity:
        return InventoryItemEntity(
            id=row.id,
            inventory_id=row.inventory.id,
            item_id=row.item_id,
            item_name=row.item_name,
            quantity=row.quantity,
            enchant=row.enchant,
        )

    def get_or_create(self, user_id: UUID, character_name: str, account_name: str) -> InventoryEntity:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        row, _ = Inventory.objects.select_related("user").get_or_create(
            user=user,
            character_name=character_name,
            defaults={"account_name": account_name},
        )
        if account_name and row.account_name != account_name:
            row.account_name = account_name
            row.save(update_fields=["account_name", "updated_at"])
        return self._inventory(row)

    def list_by_user(self, user_id: UUID) -> list[InventoryEntity]:
        return [self._inventory(row) for row in Inventory.objects.select_related("user").filter(user__id=user_id)]

    def get_by_id(self, inventory_id: UUID, user_id: UUID) -> InventoryEntity | None:
        row = Inventory.objects.select_related("user").filter(id=inventory_id, user__id=user_id).first()
        return self._inventory(row) if row else None

    def list_items(self, inventory_id: UUID) -> list[InventoryItemEntity]:
        return [self._item(row) for row in InventoryItem.objects.select_related("inventory").filter(inventory__id=inventory_id)]

    def add_item(self, inventory_id: UUID, item_id: int, item_name: str, quantity: int, enchant: int) -> InventoryItemEntity:
        inventory = Inventory.objects.get(id=inventory_id)
        row = InventoryItem.objects.filter(inventory=inventory, item_id=item_id, enchant=enchant).first()
        if row:
            row.quantity += quantity
            row.save(update_fields=["quantity", "updated_at"])
            row = InventoryItem.objects.select_related("inventory").get(pk=row.pk)
        else:
            row = InventoryItem.objects.create(
                inventory=inventory,
                user=inventory.user,
                item_id=item_id,
                item_name=item_name,
                quantity=quantity,
                enchant=enchant,
                character_name=inventory.character_name,
            )
            row.inventory = inventory
        return self._item(row)

    def remove_item(self, inventory_id: UUID, item_id: int, quantity: int, enchant: int) -> InventoryItemEntity:
        row = InventoryItem.objects.select_related("inventory").filter(
            inventory__id=inventory_id, item_id=item_id, enchant=enchant
        ).first()
        if row is None or row.quantity < quantity:
            raise InsufficientItemQuantityError()
        snapshot = self._item(row)
        if row.quantity == quantity:
            row.delete()
        else:
            row.quantity -= quantity
            row.save(update_fields=["quantity", "updated_at"])
        return InventoryItemEntity(
            id=snapshot.id,
            inventory_id=snapshot.inventory_id,
            item_id=snapshot.item_id,
            item_name=snapshot.item_name,
            quantity=quantity,
            enchant=snapshot.enchant,
        )

    def is_blocked(self, item_id: int) -> bool:
        return BlockedServerItem.objects.filter(item_id=item_id).exists() or not item_is_tradeable(item_id)

    def log(self, user_id: UUID, *, action: str, item_id: int, item_name: str, quantity: int, enchant: int, origin: str, destination: str) -> None:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        InventoryLog.objects.create(
            user=user,
            action=action,
            item_id=item_id,
            item_name=item_name,
            quantity=quantity,
            enchant=enchant,
            origin=origin,
            destination=destination,
        )
