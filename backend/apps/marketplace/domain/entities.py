from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
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
    char_title: str
    char_sex: int
    char_pvp: int
    char_pk: int
    char_clan_name: str
    char_is_clan_leader: bool
    equipment: list[dict]
    old_account: str
    new_account: str
    price: Decimal
    status: str
    notes: str
    created_at: datetime | None = None
    updated_at: datetime | None = None
    sold_at: datetime | None = None
