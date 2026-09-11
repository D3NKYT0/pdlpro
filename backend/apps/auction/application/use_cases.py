from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from django.conf import settings
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
from apps.marketplace.domain.exceptions import (
    CharacterAlreadyListedError,
    CharacterSlotLimitError,
)
from apps.marketplace.domain.repositories import ICharacterListingRepository
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.exceptions import (
    CharacterOfflineRequiredError,
    GameAccountNotFoundError,
)
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError


class ListOpenAuctionsUseCase(UseCase[None, list[AuctionEntity]]):
    """Lista os leilões abertos para consulta pública.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[AuctionEntity]``.
    """

    def __init__(self, auctions: IAuctionRepository) -> None:
        self._auctions = auctions

    def execute(self, data: None = None) -> list[AuctionEntity]:
        return self._auctions.list_open()


@dataclass(frozen=True, slots=True)
class ListMyAuctionsInput:
    """Dados de entrada de ``ListMyAuctionsUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class ListMyAuctionsUseCase(UseCase[ListMyAuctionsInput, list[AuctionEntity]]):
    """Lista os leilões criados pelo vendedor informado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListMyAuctionsInput``. O retorno
    é ``list[AuctionEntity]``.
    """

    def __init__(self, auctions: IAuctionRepository) -> None:
        self._auctions = auctions

    def execute(self, data: ListMyAuctionsInput) -> list[AuctionEntity]:
        return self._auctions.list_by_seller(data.user_id)


@dataclass(frozen=True, slots=True)
class CreateAuctionInput:
    """Dados de entrada de ``CreateAuctionUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada. Use Decimal para valores monetários, evitando conversão intermediária
    por float.
    """

    user_id: UUID
    inventory_id: UUID
    item_id: int
    quantity: int
    enchant: int
    min_bid: Decimal
    hours: int


class CreateAuctionUseCase(UseCase[CreateAuctionInput, AuctionEntity]):
    """Valida lance mínimo, quantidade e duração de 1 a 168 horas, retira os itens do inventário e
    cria o leilão com registro de movimentação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreateAuctionInput``. O retorno
    é ``AuctionEntity``.
    """

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
                kind="item",
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
class CreateCharacterAuctionInput:
    """Dados de entrada de ``CreateCharacterAuctionUseCase.execute``."""

    user_id: UUID
    username: str
    login: str
    char_id: int
    min_bid: Decimal
    hours: int


class CreateCharacterAuctionUseCase(UseCase[CreateCharacterAuctionInput, AuctionEntity]):
    """Valida acesso e personagem offline, impede listagem duplicada, captura equipamentos,
    transfere o personagem à conta de custódia e cria o leilão ``kind=character``.
    """

    def __init__(
        self,
        auctions: IAuctionRepository,
        listings: ICharacterListingRepository,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._auctions = auctions
        self._listings = listings
        self._lineage = lineage
        self._access = access
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateCharacterAuctionInput) -> AuctionEntity:
        if data.min_bid <= 0:
            raise InvalidBidError("O lance mínimo deve ser maior que zero.")
        if data.hours < 1 or data.hours > 168:
            raise InvalidAuctionDurationError()
        login = data.login or data.username
        if not self._access.can_access(data.user_id, data.username, login):
            raise AuthorizationError()
        char = self._lineage.get_character(login, data.char_id)
        if char is None:
            raise GameAccountNotFoundError("Personagem não encontrado nesta conta.")
        if char.online:
            raise CharacterOfflineRequiredError()
        if self._listings.find_active_by_char(data.char_id):
            raise CharacterAlreadyListedError()
        if self._auctions.find_open_character_auction(data.char_id):
            raise CharacterAlreadyListedError()
        equipment = [asdict(item) for item in self._lineage.list_character_equipment(char.char_id)]
        bag_items = [asdict(item) for item in self._lineage.list_character_items(char.char_id)]
        master = getattr(settings, "MARKETPLACE_MASTER_ACCOUNT", "MARKETPLACE_SYSTEM")
        with self._unit_of_work:
            self._lineage.transfer_character(data.char_id, master)
            return self._auctions.create(
                data.user_id,
                kind="character",
                item_id=None,
                item_name=char.name,
                item_enchant=0,
                quantity=1,
                min_bid=data.min_bid,
                character_name=char.name,
                ends_at=timezone.now() + timedelta(hours=data.hours),
                char_id=char.char_id,
                char_name=char.name,
                char_level=char.level,
                char_class=char.class_id,
                char_title=char.title,
                char_sex=char.sex,
                char_pvp=char.pvp,
                char_pk=char.pk,
                char_clan_name=char.clan_name,
                char_is_clan_leader=char.is_clan_leader,
                equipment=equipment,
                bag_items=bag_items,
                old_account=login,
            )


@dataclass(frozen=True, slots=True)
class PlaceBidInput:
    """Dados de entrada de ``PlaceBidUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada. Use Decimal para valores monetários, evitando conversão intermediária
    por float.
    """

    user_id: UUID
    username: str
    auction_id: UUID
    amount: Decimal
    character_name: str


class PlaceBidUseCase(UseCase[PlaceBidInput, BidEntity]):
    """Valida prazo e valor do lance, devolve o lance anterior e debita o novo participante antes
    de registrar a oferta. O vendedor não pode dar lance no próprio leilão.

    Uso: resolva pelo container e chame ``execute(data)`` com ``PlaceBidInput``. O retorno é
    ``BidEntity``.
    """

    def __init__(
        self,
        auctions: IAuctionRepository,
        inventories: IInventoryRepository,
        wallets: IWalletRepository,
        lineage: ILineageGateway,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._auctions = auctions
        self._inventories = inventories
        self._wallets = wallets
        self._lineage = lineage
        self._unit_of_work = unit_of_work

    def execute(self, data: PlaceBidInput) -> BidEntity:
        if data.amount <= 0:
            raise InvalidBidError()
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

            destination = data.character_name.strip()
            if auction.kind == "character":
                destination = data.username
                limit = int(getattr(settings, "MAX_CHARACTERS_PER_ACCOUNT", 7))
                if self._lineage.count_characters(destination) >= limit:
                    raise CharacterSlotLimitError()
            elif not destination:
                raise ValidationDomainError("Informe o personagem que receberá o item.")
            else:
                self._inventories.get_or_create(data.user_id, destination, "")

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
            return self._auctions.place_bid(auction.id, data.user_id, data.amount, destination)


class CloseExpiredAuctionsUseCase(UseCase[None, dict]):
    """Finaliza leilões vencidos em transações individuais.

    Itens: entrega ao vencedor ou devolve ao vendedor. Personagens: transfere da custódia ao
    vencedor (crédito ao vendedor) ou devolve ``old_account`` sem venda.
    """

    def __init__(
        self,
        auctions: IAuctionRepository,
        inventories: IInventoryRepository,
        wallets: IWalletRepository,
        lineage: ILineageGateway,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._auctions = auctions
        self._inventories = inventories
        self._wallets = wallets
        self._lineage = lineage
        self._unit_of_work = unit_of_work

    def execute(self, data: None = None) -> dict:
        closed = 0
        for auction in self._auctions.list_expired_open(timezone.now()):
            with self._unit_of_work:
                current = self._auctions.get_by_id(auction.id)
                if current is None or current.status != "open":
                    continue
                if current.kind == "character":
                    self._close_character(current)
                elif current.highest_bidder_id and current.current_bid:
                    self._close_item_sold(current)
                else:
                    self._close_item_return(current)
                self._auctions.mark_finished(current.id)
                closed += 1
        return {"closed": closed}

    def _close_character(self, current: AuctionEntity) -> None:
        master = getattr(settings, "MARKETPLACE_MASTER_ACCOUNT", "MARKETPLACE_SYSTEM")
        label = current.char_name or current.item_name or "personagem"
        if current.char_id is None or not current.old_account:
            return
        in_custody = self._lineage.verify_character_ownership(current.char_id, master)
        if current.highest_bidder_id and current.current_bid and current.highest_bidder_username and in_custody:
            limit = int(getattr(settings, "MAX_CHARACTERS_PER_ACCOUNT", 7))
            if self._lineage.count_characters(current.highest_bidder_username) >= limit:
                # Slot cheio no fechamento: devolve o lance e o personagem ao vendedor.
                bidder_wallet = self._wallets.get_or_create(current.highest_bidder_id)
                self._wallets.credit(
                    bidder_wallet.id,
                    current.current_bid,
                    origin="auction",
                    description=f"Devolução de lance (slot indisponível) — {label}",
                )
                self._lineage.transfer_character(current.char_id, current.old_account)
                return
            seller_wallet = self._wallets.get_or_create(current.seller_id)
            self._wallets.credit(
                seller_wallet.id,
                current.current_bid,
                origin=current.highest_bidder_username,
                description=f"Venda no leilão {label}",
            )
            self._lineage.transfer_character(current.char_id, current.highest_bidder_username)
            return
        if in_custody:
            self._lineage.transfer_character(current.char_id, current.old_account)

    def _close_item_sold(self, current: AuctionEntity) -> None:
        winning = self._auctions.winning_bid(current.id)
        if winning is None or current.item_id is None:
            return
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

    def _close_item_return(self, current: AuctionEntity) -> None:
        if current.item_id is None:
            return
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
