from __future__ import annotations

from dataclasses import asdict, dataclass
from decimal import Decimal
from uuid import UUID

from django.conf import settings

from apps.marketplace.domain.entities import CharacterListingEntity
from apps.marketplace.domain.exceptions import (
    CannotBuyOwnListingError,
    CharacterAlreadyListedError,
    CharacterSlotLimitError,
    InvalidListingPriceError,
    ListingNotForSaleError,
    ListingNotFoundError,
)
from apps.marketplace.domain.repositories import ICharacterListingRepository
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.exceptions import CharacterOfflineRequiredError, GameAccountNotFoundError
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError


class ListPublicListingsUseCase(UseCase[None, list[CharacterListingEntity]]):
    """Lista os anúncios de personagens que ainda estão disponíveis para compra.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[CharacterListingEntity]``.
    """

    def __init__(self, listings: ICharacterListingRepository) -> None:
        self._listings = listings

    def execute(self, data: None = None) -> list[CharacterListingEntity]:
        return self._listings.list_for_sale()


@dataclass(frozen=True, slots=True)
class ListMyListingsInput:
    """Dados de entrada de ``ListMyListingsUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class ListMyListingsUseCase(UseCase[ListMyListingsInput, list[CharacterListingEntity]]):
    """Lista anúncios pertencentes ao vendedor informado, incluindo seu estado atual.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListMyListingsInput``. O retorno
    é ``list[CharacterListingEntity]``.
    """

    def __init__(self, listings: ICharacterListingRepository) -> None:
        self._listings = listings

    def execute(self, data: ListMyListingsInput) -> list[CharacterListingEntity]:
        return self._listings.list_by_seller(data.user_id)


@dataclass(frozen=True, slots=True)
class CreateListingInput:
    """Dados de entrada de ``CreateListingUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada. Use Decimal para valores monetários, evitando conversão intermediária
    por float.
    """

    user_id: UUID
    username: str
    login: str
    char_id: int
    price: Decimal
    notes: str = ""


class CreateListingUseCase(UseCase[CreateListingInput, CharacterListingEntity]):
    """Valida preço, acesso e personagem offline, captura seus equipamentos e transfere o
    personagem à conta de custódia antes de criar o anúncio.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreateListingInput``. O retorno
    é ``CharacterListingEntity``.
    """

    def __init__(
        self,
        listings: ICharacterListingRepository,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._listings = listings
        self._lineage = lineage
        self._access = access
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateListingInput) -> CharacterListingEntity:
        if data.price <= 0:
            raise InvalidListingPriceError()
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
        equipment = [asdict(item) for item in self._lineage.list_character_equipment(char.char_id)]
        master = getattr(settings, "MARKETPLACE_MASTER_ACCOUNT", "MARKETPLACE_SYSTEM")
        with self._unit_of_work:
            self._lineage.transfer_character(data.char_id, master)
            return self._listings.create(
                data.user_id,
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
                old_account=login,
                price=data.price,
                notes=data.notes,
            )


@dataclass(frozen=True, slots=True)
class PurchaseListingInput:
    """Dados de entrada de ``PurchaseListingUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    buyer_id: UUID
    buyer_username: str
    listing_id: UUID


class PurchaseListingUseCase(UseCase[PurchaseListingInput, CharacterListingEntity]):
    """Valida anúncio, comprador, slots e custódia; debita o comprador, credita o vendedor,
    transfere o personagem e marca a venda. O gateway do jogo não participa do rollback do
    Django.

    Uso: resolva pelo container e chame ``execute(data)`` com ``PurchaseListingInput``. O
    retorno é ``CharacterListingEntity``.
    """

    def __init__(
        self,
        listings: ICharacterListingRepository,
        lineage: ILineageGateway,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._listings = listings
        self._lineage = lineage
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: PurchaseListingInput) -> CharacterListingEntity:
        with self._unit_of_work:
            listing = self._listings.get_by_id(data.listing_id)
            if listing is None:
                raise ListingNotFoundError()
            if listing.status != "for_sale":
                raise ListingNotForSaleError()
            if listing.seller_id == data.buyer_id:
                raise CannotBuyOwnListingError()
            limit = int(getattr(settings, "MAX_CHARACTERS_PER_ACCOUNT", 7))
            if self._lineage.count_characters(data.buyer_username) >= limit:
                raise CharacterSlotLimitError()
            master = getattr(settings, "MARKETPLACE_MASTER_ACCOUNT", "MARKETPLACE_SYSTEM")
            if not self._lineage.verify_character_ownership(listing.char_id, master):
                raise ListingNotForSaleError("Personagem não está na conta do marketplace.")
            buyer_wallet = self._wallets.get_or_create(data.buyer_id)
            if buyer_wallet.balance < listing.price:
                raise InsufficientBalanceError()
            seller_wallet = self._wallets.get_or_create(listing.seller_id)
            self._wallets.debit(
                buyer_wallet.id,
                listing.price,
                destination=listing.seller_username,
                description=f"Compra de personagem: {listing.char_name}",
            )
            self._wallets.credit(
                seller_wallet.id,
                listing.price,
                origin=data.buyer_username,
                description=f"Venda de personagem: {listing.char_name}",
            )
            self._lineage.transfer_character(listing.char_id, data.buyer_username)
            return self._listings.mark_sold(listing.id, data.buyer_id, data.buyer_username)


@dataclass(frozen=True, slots=True)
class CancelListingInput:
    """Dados de entrada de ``CancelListingUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    listing_id: UUID


class CancelListingUseCase(UseCase[CancelListingInput, CharacterListingEntity]):
    """Confirma o vendedor e a custódia, devolve o personagem à conta de origem e cancela o
    anúncio.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CancelListingInput``. O retorno
    é ``CharacterListingEntity``.
    """

    def __init__(
        self,
        listings: ICharacterListingRepository,
        lineage: ILineageGateway,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._listings = listings
        self._lineage = lineage
        self._unit_of_work = unit_of_work

    def execute(self, data: CancelListingInput) -> CharacterListingEntity:
        with self._unit_of_work:
            listing = self._listings.get_by_id(data.listing_id)
            if listing is None:
                raise ListingNotFoundError()
            if listing.seller_id != data.user_id:
                raise AuthorizationError()
            if listing.status != "for_sale":
                raise ListingNotForSaleError()
            limit = int(getattr(settings, "MAX_CHARACTERS_PER_ACCOUNT", 7))
            if self._lineage.count_characters(listing.old_account) >= limit:
                raise CharacterSlotLimitError()
            master = getattr(settings, "MARKETPLACE_MASTER_ACCOUNT", "MARKETPLACE_SYSTEM")
            if not self._lineage.verify_character_ownership(listing.char_id, master):
                raise ListingNotForSaleError("Personagem não está na conta do marketplace.")
            self._lineage.transfer_character(listing.char_id, listing.old_account)
            return self._listings.mark_cancelled(listing.id)
