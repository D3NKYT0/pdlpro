from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from apps.auction.domain.entities import AuctionEntity, BidEntity


class IAuctionRepository(ABC):
    """Porta de leilões, lances e encerramento de ofertas.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def get_by_id(self, auction_id: UUID) -> AuctionEntity | None:
        raise NotImplementedError

    @abstractmethod
    def list_open(self) -> list[AuctionEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_expired_open(self, now: datetime) -> list[AuctionEntity]:
        raise NotImplementedError

    @abstractmethod
    def list_by_seller(self, user_id: UUID) -> list[AuctionEntity]:
        raise NotImplementedError

    @abstractmethod
    def find_open_character_auction(self, char_id: int) -> AuctionEntity | None:
        raise NotImplementedError

    @abstractmethod
    def create(
        self,
        seller_id: UUID,
        *,
        kind: str = "item",
        item_id: int | None = None,
        item_name: str = "",
        item_enchant: int = 0,
        quantity: int = 1,
        min_bid: Decimal,
        character_name: str = "",
        ends_at: datetime,
        char_id: int | None = None,
        char_name: str = "",
        char_level: int = 1,
        char_class: int = 0,
        char_title: str = "",
        char_sex: int = 0,
        char_pvp: int = 0,
        char_pk: int = 0,
        char_clan_name: str = "",
        char_is_clan_leader: bool = False,
        equipment: list | None = None,
        old_account: str = "",
    ) -> AuctionEntity:
        raise NotImplementedError

    @abstractmethod
    def place_bid(
        self,
        auction_id: UUID,
        bidder_id: UUID,
        amount: Decimal,
        character_name: str,
    ) -> BidEntity:
        raise NotImplementedError

    @abstractmethod
    def winning_bid(self, auction_id: UUID) -> BidEntity | None:
        raise NotImplementedError

    @abstractmethod
    def mark_finished(self, auction_id: UUID) -> AuctionEntity:
        raise NotImplementedError
