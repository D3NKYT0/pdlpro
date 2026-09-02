from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AuctionEntity:
    """Estado de um leilão, incluindo vendedor, item, prazo e maior lance.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

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
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class BidEntity:
    """Oferta registrada em um leilão com participante, valor e personagem de destino.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    auction_id: UUID
    bidder_id: UUID
    amount: Decimal
    character_name: str
