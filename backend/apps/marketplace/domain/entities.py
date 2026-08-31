from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True, slots=True)
class CharacterListingEntity:
    id: UUID
    seller_id: UUID
    seller_username: str
    buyer_id: UUID | None
    char_id: int
    char_name: str
    char_level: int
    char_class: int
    old_account: str
    new_account: str
    price: Decimal
    status: str
    notes: str
