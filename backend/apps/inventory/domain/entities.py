from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID


@dataclass(frozen=True, slots=True)
class InventoryEntity:
    id: UUID
    user_id: UUID
    character_name: str
    account_name: str


@dataclass(frozen=True, slots=True)
class InventoryItemEntity:
    id: UUID
    inventory_id: UUID
    item_id: int
    item_name: str
    quantity: int
    enchant: int
