from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from apps.auction.domain.entities import AuctionEntity, BidEntity


class IAuctionRepository(ABC):
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
    def create(
        self,
        seller_id: UUID,
        *,
        item_id: int,
        item_name: str,
        item_enchant: int,
        quantity: int,
        min_bid: Decimal,
        character_name: str,
        ends_at: datetime,
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
