"""Corrida na compra: o segundo comprador não paga nem recebe o personagem."""

from __future__ import annotations

from dataclasses import dataclass, replace
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from django.contrib.auth import get_user_model

from apps.marketplace.application.use_cases import (
    PurchaseListingInput,
    PurchaseListingUseCase,
)
from apps.marketplace.domain.entities import CharacterListingEntity
from apps.marketplace.domain.exceptions import ListingNotForSaleError
from apps.marketplace.infrastructure.models import CharacterListing
from apps.marketplace.infrastructure.repositories import (
    DjangoCharacterListingRepository,
)
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.domain.entities import InsufficientBalanceError, WalletEntity
from apps.wallet.infrastructure.models import Wallet, WalletTransaction
from apps.wallet.infrastructure.repositories import DjangoWalletRepository
from common.di.bootstrap import DependencyInjection
from common.infrastructure.unit_of_work import DjangoUnitOfWork


class NullUnitOfWork:
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        return None

    def commit(self) -> None:
        return None

    def rollback(self) -> None:
        return None


@dataclass
class MemoryWallet:
    id: UUID
    user_id: UUID
    balance: Decimal
    bonus_balance: Decimal = Decimal(0)

    def entity(self) -> WalletEntity:
        return WalletEntity(self.id, self.user_id, self.balance, self.bonus_balance)


class MemoryWallets:
    def __init__(self) -> None:
        self.by_user: dict[UUID, MemoryWallet] = {}
        self.events: list[str] = []

    def get_or_create(self, user_id: UUID) -> WalletEntity:
        if user_id not in self.by_user:
            self.by_user[user_id] = MemoryWallet(uuid4(), user_id, Decimal(0))
        return self.by_user[user_id].entity()

    def debit(self, wallet_id: UUID, amount: Decimal, *, destination: str, description: str) -> WalletEntity:
        self.events.append("debit")
        wallet = next(item for item in self.by_user.values() if item.id == wallet_id)
        if wallet.balance < amount:
            raise InsufficientBalanceError()
        wallet.balance -= amount
        return wallet.entity()

    def credit(self, wallet_id: UUID, amount: Decimal, *, origin: str, description: str) -> WalletEntity:
        self.events.append("credit")
        wallet = next(item for item in self.by_user.values() if item.id == wallet_id)
        wallet.balance += amount
        return wallet.entity()


class RacingListings:
    """Simula duas compras que ainda enxergam ``for_sale`` na leitura inicial."""

    def __init__(self, listing: CharacterListingEntity) -> None:
        self.listing = listing
        self.events: list[str] = []
        self.claimed_by: UUID | None = None

    def get_by_id(self, listing_id: UUID, *, lock: bool = False) -> CharacterListingEntity | None:
        self.events.append("get")
        return self.listing

    def mark_sold(self, listing_id: UUID, buyer_id: UUID, new_account: str) -> CharacterListingEntity:
        self.events.append("mark_sold")
        if self.claimed_by is not None:
            raise ListingNotForSaleError()
        self.claimed_by = buyer_id
        return replace(self.listing, status="sold", buyer_id=buyer_id, new_account=new_account)


class RecordingLineage:
    def __init__(self) -> None:
        self.transfers: list[tuple[int, str]] = []

    def count_characters(self, login: str) -> int:
        return 0

    def verify_character_ownership(self, char_id: int, account: str) -> bool:
        return True

    def transfer_character(self, char_id: int, new_account: str, *, from_account: str) -> None:
        self.transfers.append((char_id, new_account))


class StaleListingRead:
    def __init__(self, inner: DjangoCharacterListingRepository, snapshot: CharacterListingEntity) -> None:
        self._inner = inner
        self._snapshot = snapshot

    def get_by_id(self, listing_id: UUID, *, lock: bool = False) -> CharacterListingEntity | None:
        return self._snapshot

    def mark_sold(self, listing_id: UUID, buyer_id: UUID, new_account: str) -> CharacterListingEntity:
        return self._inner.mark_sold(listing_id, buyer_id, new_account)


class AlwaysInCustody:
    def __init__(self, inner) -> None:
        self._inner = inner
        self.transfers: list[tuple[int, str]] = []

    def count_characters(self, login: str) -> int:
        return 0

    def verify_character_ownership(self, char_id: int, account: str) -> bool:
        return True

    def transfer_character(self, char_id: int, new_account: str, *, from_account: str) -> None:
        self.transfers.append((char_id, new_account))
        self._inner.transfer_character(char_id, new_account, from_account=from_account)


def _listing_entity(*, seller_id: UUID, price: Decimal = Decimal("25.00")) -> CharacterListingEntity:
    return CharacterListingEntity(
        id=uuid4(),
        seller_id=seller_id,
        seller_username="seller",
        buyer_id=None,
        char_id=42,
        char_name="Hero",
        char_level=1,
        char_class=0,
        char_title="",
        char_sex=0,
        char_pvp=0,
        char_pk=0,
        char_clan_name="",
        char_is_clan_leader=False,
        equipment=[],
        old_account="seller",
        new_account="",
        price=price,
        status="for_sale",
        notes="",
    )


def test_losing_buyer_does_not_debit_or_transfer_when_claim_fails():
    seller_id = uuid4()
    buyer_one = uuid4()
    buyer_two = uuid4()
    listings = RacingListings(_listing_entity(seller_id=seller_id))
    wallets = MemoryWallets()
    wallets.by_user[seller_id] = MemoryWallet(uuid4(), seller_id, Decimal(0))
    wallets.by_user[buyer_one] = MemoryWallet(uuid4(), buyer_one, Decimal(40))
    wallets.by_user[buyer_two] = MemoryWallet(uuid4(), buyer_two, Decimal(40))
    lineage = RecordingLineage()
    use_case = PurchaseListingUseCase(listings, lineage, wallets, NullUnitOfWork())

    first = use_case.execute(PurchaseListingInput(buyer_one, "buyer1", listings.listing.id))
    assert first.status == "sold"
    assert listings.events == ["get", "mark_sold"]
    assert wallets.events == ["debit", "credit"]

    listings.events.clear()
    wallets.events.clear()
    with pytest.raises(ListingNotForSaleError):
        use_case.execute(PurchaseListingInput(buyer_two, "buyer2", listings.listing.id))

    assert listings.events == ["get", "mark_sold"]
    assert wallets.events == []
    assert wallets.by_user[buyer_one].balance == Decimal(15)
    assert wallets.by_user[buyer_two].balance == Decimal(40)
    assert wallets.by_user[seller_id].balance == Decimal(25)
    assert lineage.transfers == [(42, "buyer1")]


@pytest.mark.django_db
def test_mark_sold_is_compare_and_set():
    User = get_user_model()
    seller = User.objects.create_user(username="cas_seller", email="cas_seller@test.dev")
    first = User.objects.create_user(username="cas_one", email="cas_one@test.dev")
    second = User.objects.create_user(username="cas_two", email="cas_two@test.dev")
    listing = CharacterListing.objects.create(
        seller=seller, char_id=7, char_name="CasHero", price=10, old_account="cas_seller"
    )
    repo = DjangoCharacterListingRepository()

    sold = repo.mark_sold(listing.id, first.id, "cas_one")
    assert sold.status == "sold"
    assert sold.buyer_id == first.id

    with pytest.raises(ListingNotForSaleError):
        repo.mark_sold(listing.id, second.id, "cas_two")

    listing.refresh_from_db()
    assert listing.status == CharacterListing.Status.SOLD
    assert listing.buyer_id == first.pk
    assert listing.new_account == "cas_one"


@pytest.mark.django_db
def test_mark_cancelled_does_not_overwrite_sold():
    User = get_user_model()
    seller = User.objects.create_user(username="cas_cancel_s", email="cas_cancel_s@test.dev")
    buyer = User.objects.create_user(username="cas_cancel_b", email="cas_cancel_b@test.dev")
    listing = CharacterListing.objects.create(
        seller=seller, char_id=8, char_name="CasCancel", price=10, old_account="cas_cancel_s"
    )
    repo = DjangoCharacterListingRepository()
    repo.mark_sold(listing.id, buyer.id, "cas_cancel_b")

    with pytest.raises(ListingNotForSaleError):
        repo.mark_cancelled(listing.id)

    listing.refresh_from_db()
    assert listing.status == CharacterListing.Status.SOLD


@pytest.mark.django_db
def test_stale_for_sale_read_does_not_double_charge_or_transfer(settings):
    User = get_user_model()
    seller = User.objects.create_user(username="stale_s", email="stale_s@test.dev")
    buyer_one = User.objects.create_user(username="stale_b1", email="stale_b1@test.dev")
    buyer_two = User.objects.create_user(username="stale_b2", email="stale_b2@test.dev")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    char = gateway.seed_character(settings.MARKETPLACE_MASTER_ACCOUNT, "StaleHero")
    listing = CharacterListing.objects.create(
        seller=seller, char_id=char.char_id, char_name=char.name, price=25, old_account="stale_s"
    )
    Wallet.objects.create(user=buyer_one, balance=40)
    Wallet.objects.create(user=buyer_two, balance=40)

    inner = DjangoCharacterListingRepository()
    snapshot = inner.get_by_id(listing.id)
    lineage = AlwaysInCustody(gateway)
    use_case = PurchaseListingUseCase(
        StaleListingRead(inner, snapshot),
        lineage,
        DjangoWalletRepository(),
        DjangoUnitOfWork(),
    )

    first = use_case.execute(PurchaseListingInput(buyer_one.id, buyer_one.username, listing.id))
    assert first.status == "sold"
    with pytest.raises(ListingNotForSaleError):
        use_case.execute(PurchaseListingInput(buyer_two.id, buyer_two.username, listing.id))

    listing.refresh_from_db()
    assert listing.status == CharacterListing.Status.SOLD
    assert listing.buyer_id == buyer_one.pk
    assert Wallet.objects.get(user=buyer_one).balance == Decimal(15)
    assert Wallet.objects.get(user=buyer_two).balance == Decimal(40)
    assert Wallet.objects.get(user=seller).balance == Decimal(25)
    assert WalletTransaction.objects.count() == 2
    assert lineage.transfers == [(char.char_id, "stale_b1")]
    assert gateway.get_character("stale_b1", char.char_id) is not None
    assert gateway.get_character("stale_b2", char.char_id) is None
