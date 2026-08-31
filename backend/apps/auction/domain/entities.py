from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AuctionEntity:
    id: UUID
    seller_id: UUID
    seller_username: str
    item_id: int
    item_name: str
    item_enchant: int
    quantity: int
    min_bid: Decimal
    current_bid: Decimal | None
    highest_bidder_id: UUID | None
    highest_bidder_username: str | None
    character_name: str
    ends_at: datetime
    status: str


@dataclass(frozen=True, slots=True)
class BidEntity:
    id: UUID
    auction_id: UUID
    bidder_id: UUID
    amount: Decimal
    character_name: str
