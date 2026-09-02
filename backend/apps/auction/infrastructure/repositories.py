from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from apps.auction.domain.entities import AuctionEntity, BidEntity
from apps.auction.domain.repositories import IAuctionRepository
from apps.auction.infrastructure.models import Auction, Bid


class DjangoAuctionRepository(IAuctionRepository):
    """Adaptador Django de ``IAuctionRepository`` para leilões, lances e encerramento de ofertas.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork.
    """

    def _auction(self, row: Auction) -> AuctionEntity:
        return AuctionEntity(
            id=row.id,
            seller_id=row.seller.id,
            seller_username=row.seller.username,
            item_id=row.item_id,
            item_name=row.item_name,
            item_enchant=row.item_enchant,
            quantity=row.quantity,
            min_bid=row.min_bid,
            current_bid=row.current_bid,
            highest_bidder_id=row.highest_bidder.id if row.highest_bidder_id else None,
            highest_bidder_username=row.highest_bidder.username if row.highest_bidder_id else None,
            character_name=row.character_name,
            ends_at=row.ends_at,
            status=row.status,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _bid(self, row: Bid) -> BidEntity:
        return BidEntity(
            id=row.id,
            auction_id=row.auction.id,
            bidder_id=row.bidder.id,
            amount=row.amount,
            character_name=row.character_name,
        )

    def get_by_id(self, auction_id: UUID) -> AuctionEntity | None:
        row = Auction.objects.select_related("seller", "highest_bidder").filter(id=auction_id).first()
        return self._auction(row) if row else None

    def list_open(self) -> list[AuctionEntity]:
        rows = Auction.objects.select_related("seller", "highest_bidder").filter(status=Auction.Status.OPEN)
        return [self._auction(row) for row in rows]

    def list_expired_open(self, now: datetime) -> list[AuctionEntity]:
        rows = Auction.objects.select_related("seller", "highest_bidder").filter(
            status=Auction.Status.OPEN, ends_at__lte=now
        )
        return [self._auction(row) for row in rows]

    def list_by_seller(self, user_id: UUID) -> list[AuctionEntity]:
        rows = Auction.objects.select_related("seller", "highest_bidder").filter(seller__id=user_id)
        return [self._auction(row) for row in rows]

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
        from django.contrib.auth import get_user_model

        seller = get_user_model().objects.get(id=seller_id)
        row = Auction.objects.create(
            seller=seller,
            item_id=item_id,
            item_name=item_name,
            item_enchant=item_enchant,
            quantity=quantity,
            min_bid=min_bid,
            character_name=character_name,
            ends_at=ends_at,
        )
        return self._auction(row)

    def place_bid(self, auction_id: UUID, bidder_id: UUID, amount: Decimal, character_name: str) -> BidEntity:
        from django.contrib.auth import get_user_model

        auction = Auction.objects.select_related("seller", "highest_bidder").select_for_update().get(id=auction_id)
        bidder = get_user_model().objects.get(id=bidder_id)
        auction.current_bid = amount
        auction.highest_bidder = bidder
        auction.save(update_fields=["current_bid", "highest_bidder", "updated_at"])
        row = Bid.objects.create(auction=auction, bidder=bidder, amount=amount, character_name=character_name)
        row.auction = auction
        return self._bid(row)

    def winning_bid(self, auction_id: UUID) -> BidEntity | None:
        row = (
            Bid.objects.select_related("auction", "bidder")
            .filter(auction__id=auction_id)
            .order_by("-amount", "-created_at")
            .first()
        )
        return self._bid(row) if row else None

    def mark_finished(self, auction_id: UUID) -> AuctionEntity:
        row = Auction.objects.select_related("seller", "highest_bidder").select_for_update().get(id=auction_id)
        row.status = Auction.Status.FINISHED
        row.save(update_fields=["status", "updated_at"])
        return self._auction(row)
