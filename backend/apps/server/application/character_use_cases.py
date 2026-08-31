from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.repositories import ILinkSlotRepository, IServicePriceRepository
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError

_NICK_MIN, _NICK_MAX = 2, 16


@dataclass(frozen=True, slots=True)
class CharacterServiceInput:
    user_id: UUID
    username: str
    login: str
    char_id: int


class ChangeNicknameUseCase(UseCase[tuple[CharacterServiceInput, str], None]):
    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: tuple[CharacterServiceInput, str]) -> None:
        actor, name = data
        self._assert_access(actor)
        cleaned = name.strip()
        if not cleaned.isalnum() or not (_NICK_MIN <= len(cleaned) <= _NICK_MAX):
            raise ValidationDomainError("Nick inválido. Use 2 a 16 letras ou números.")
        price = self._prices.get_price("CHANGE_NICKNAME")
        with self._unit_of_work:
            self._lineage.change_nickname(actor.login, actor.char_id, cleaned)
            self._charge(actor.user_id, price, f"Troca de nick ({cleaned})")

    def _assert_access(self, actor: CharacterServiceInput) -> None:
        if not self._access.can_access(actor.user_id, actor.username, actor.login):
            raise AuthorizationError()

    def _charge(self, user_id: UUID, amount: Decimal, description: str) -> None:
        if amount <= 0:
            return
        wallet = self._wallets.get_or_create(user_id)
        self._wallets.debit(wallet.id, amount, destination="service", description=description)


class ChangeSexUseCase(UseCase[tuple[CharacterServiceInput, str], None]):
    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: tuple[CharacterServiceInput, str]) -> None:
        actor, sex_label = data
        if not self._access.can_access(actor.user_id, actor.username, actor.login):
            raise AuthorizationError()
        sex = 0 if sex_label.upper() == "M" else 1
        if sex_label.upper() not in {"M", "F"}:
            raise ValidationDomainError("Sexo deve ser M ou F.")
        price = self._prices.get_price("CHANGE_SEX")
        with self._unit_of_work:
            self._lineage.change_sex(actor.login, actor.char_id, sex)
            wallet = self._wallets.get_or_create(actor.user_id)
            if price > 0:
                self._wallets.debit(wallet.id, price, destination="service", description="Troca de sexo")


class UnstuckCharacterUseCase(UseCase[CharacterServiceInput, None]):
    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: CharacterServiceInput) -> None:
        if not self._access.can_access(data.user_id, data.username, data.login):
            raise AuthorizationError()
        self._lineage.unstuck(data.login, data.char_id)


@dataclass(frozen=True, slots=True)
class PurchaseLinkSlotInput:
    user_id: UUID
    quantity: int


class PurchaseLinkSlotUseCase(UseCase[PurchaseLinkSlotInput, dict]):
    def __init__(
        self,
        prices: IServicePriceRepository,
        slots: ILinkSlotRepository,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._prices = prices
        self._slots = slots
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: PurchaseLinkSlotInput) -> dict:
        if data.quantity < 1 or data.quantity > 10:
            raise ValidationDomainError("Compre entre 1 e 10 slots.")
        unit = self._prices.get_price("LINK_SLOT")
        total = unit * data.quantity
        with self._unit_of_work:
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.debit(wallet.id, total, destination="link-slot", description=f"{data.quantity} slot(s)")
            extra = self._slots.add_slots(data.user_id, data.quantity)
        return {"extra_slots": extra, "paid": str(total)}
