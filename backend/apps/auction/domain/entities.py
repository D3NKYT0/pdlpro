from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from uuid import UUID


@dataclass(frozen=True, slots=True)
class AuctionEntity:
    """Estado de um leilão, incluindo vendedor, ativo, prazo e maior lance.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado. ``kind`` distingue item do inventário e personagem.
    """

    id: UUID
    seller_id: UUID
    seller_username: str
    kind: str
    item_id: int | None
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
    char_id: int | None = None
    char_name: str = ""
    char_level: int = 1
    char_class: int = 0
    char_title: str = ""
    char_sex: int = 0
    char_pvp: int = 0
    char_pk: int = 0
    char_clan_name: str = ""
    char_is_clan_leader: bool = False
    equipment: list = field(default_factory=list)
    old_account: str = ""


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
