from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from django.utils import timezone

from apps.auction.domain.entities import AuctionEntity, BidEntity
from apps.auction.domain.exceptions import (
    AuctionNotActiveError,
    AuctionNotFoundError,
    CannotBidOwnAuctionError,
    InvalidAuctionDurationError,
    InvalidBidError,
)
from apps.auction.domain.repositories import IAuctionRepository
from apps.inventory.domain.exceptions import InventoryNotFoundError
from apps.inventory.domain.repositories import IInventoryRepository
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError


class ListOpenAuctionsUseCase(UseCase[None, list[AuctionEntity]]):
    def __init__(self, auctions: IAuctionRepository) -> None:
        self._auctions = auctions

    def execute(self, data: None = None) -> list[AuctionEntity]:
        return self._auctions.list_open()


@dataclass(frozen=True, slots=True)
class ListMyAuctionsInput:
    user_id: UUID


class ListMyAuctionsUseCase(UseCase[ListMyAuctionsInput, list[AuctionEntity]]):
    def __init__(self, auctions: IAuctionRepository) -> None:
        self._auctions = auctions

    def execute(self, data: ListMyAuctionsInput) -> list[AuctionEntity]:
        return self._auctions.list_by_seller(data.user_id)


@dataclass(frozen=True, slots=True)
class CreateAuctionInput:
    user_id: UUID
    inventory_id: UUID
    item_id: int
    quantity: int
    enchant: int
    min_bid: Decimal
    hours: int


class CreateAuctionUseCase(UseCase[CreateAuctionInput, AuctionEntity]):
    def __init__(
        self,
        auctions: IAuctionRepository,
        inventories: IInventoryRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._auctions = auctions
        self._inventories = inventories
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateAuctionInput) -> AuctionEntity:
        if data.min_bid <= 0:
            raise InvalidBidError("O lance mínimo deve ser maior que zero.")
        if data.quantity < 1:
            raise ValidationDomainError("Quantidade inválida.")
        if data.hours < 1 or data.hours > 168:
            raise InvalidAuctionDurationError()
        inventory = self._inventories.get_by_id(data.inventory_id, data.user_id)
        if inventory is None:
            raise InventoryNotFoundError()
        with self._unit_of_work:
            removed = self._inventories.remove_item(inventory.id, data.item_id, data.quantity, data.enchant)
            auction = self._auctions.create(
                data.user_id,
                item_id=removed.item_id,
                item_name=removed.item_name,
                item_enchant=removed.enchant,
                quantity=removed.quantity,
                min_bid=data.min_bid,
                character_name=inventory.character_name,
                ends_at=timezone.now() + timedelta(hours=data.hours),
            )
            self._inventories.log(
                data.user_id,
                action="auction_list",
                item_id=removed.item_id,
                item_name=removed.item_name,
                quantity=removed.quantity,
                enchant=removed.enchant,
                origin=inventory.character_name,
                destination="auction",
            )
            return auction


@dataclass(frozen=True, slots=True)
class PlaceBidInput:
    user_id: UUID
    auction_id: UUID
    amount: Decimal
    character_name: str


class PlaceBidUseCase(UseCase[PlaceBidInput, BidEntity]):
    def __init__(
        self,
        auctions: IAuctionRepository,
        inventories: IInventoryRepository,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._auctions = auctions
        self._inventories = inventories
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: PlaceBidInput) -> BidEntity:
        if data.amount <= 0:
            raise InvalidBidError()
        if not data.character_name.strip():
            raise ValidationDomainError("Informe o personagem que receberá o item.")
        with self._unit_of_work:
            auction = self._auctions.get_by_id(data.auction_id)
            if auction is None:
                raise AuctionNotFoundError()
            if auction.status != "open" or auction.ends_at <= timezone.now():
                raise AuctionNotActiveError()
            if auction.seller_id == data.user_id:
                raise CannotBidOwnAuctionError()
            if data.amount <= auction.min_bid:
                raise InvalidBidError("O lance deve ser maior que o valor inicial.")
            if auction.current_bid is not None and data.amount <= auction.current_bid:
                raise InvalidBidError("O lance deve ser maior que o lance atual.")
            self._inventories.get_or_create(data.user_id, data.character_name, "")
            wallet = self._wallets.get_or_create(data.user_id)
            if wallet.balance < data.amount:
                raise InsufficientBalanceError()
            if auction.highest_bidder_id and auction.current_bid:
                previous = self._wallets.get_or_create(auction.highest_bidder_id)
                self._wallets.credit(
                    previous.id,
                    auction.current_bid,
                    origin="auction",
                    description="Devolução de lance no leilão",
                )
            self._wallets.debit(
                wallet.id,
                data.amount,
                destination=auction.seller_username,
                description="Lance no leilão",
            )
            return self._auctions.place_bid(auction.id, data.user_id, data.amount, data.character_name)


class CloseExpiredAuctionsUseCase(UseCase[None, dict]):
    def __init__(
        self,
        auctions: IAuctionRepository,
        inventories: IInventoryRepository,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._auctions = auctions
        self._inventories = inventories
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: None = None) -> dict:
        closed = 0
        for auction in self._auctions.list_expired_open(timezone.now()):
            with self._unit_of_work:
                current = self._auctions.get_by_id(auction.id)
                if current is None or current.status != "open":
                    continue
                if current.highest_bidder_id and current.current_bid:
                    winning = self._auctions.winning_bid(current.id)
                    if winning is None:
                        continue
                    seller_wallet = self._wallets.get_or_create(current.seller_id)
                    self._wallets.credit(
                        seller_wallet.id,
                        current.current_bid,
                        origin=current.highest_bidder_username or "",
                        description=f"Venda no leilão {current.item_name}",
                    )
                    dest = self._inventories.get_or_create(
                        current.highest_bidder_id,
                        winning.character_name,
                        "",
                    )
                    self._inventories.add_item(
                        dest.id,
                        current.item_id,
                        current.item_name,
                        current.quantity,
                        current.item_enchant,
                    )
                    self._inventories.log(
                        current.highest_bidder_id,
                        action="auction_won",
                        item_id=current.item_id,
                        item_name=current.item_name,
                        quantity=current.quantity,
                        enchant=current.item_enchant,
                        origin="auction",
                        destination=winning.character_name,
                    )
                else:
                    seller_inv = self._inventories.get_or_create(current.seller_id, current.character_name, "")
                    self._inventories.add_item(
                        seller_inv.id,
                        current.item_id,
                        current.item_name,
                        current.quantity,
                        current.item_enchant,
                    )
                    self._inventories.log(
                        current.seller_id,
                        action="auction_return",
                        item_id=current.item_id,
                        item_name=current.item_name,
                        quantity=current.quantity,
                        enchant=current.item_enchant,
                        origin="auction",
                        destination=current.character_name,
                    )
                self._auctions.mark_finished(current.id)
                closed += 1
        return {"closed": closed}
