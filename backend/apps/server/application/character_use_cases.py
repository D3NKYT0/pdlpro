from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.server.application.paid_services import execute_paid_service
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.appearance import (
    appearance_catalog,
    appearance_value,
    parse_appearance,
)
from apps.server.domain.exceptions import CharacterServiceUnavailableError
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.repositories import (
    ICharacterServiceOperationRepository,
    ILinkSlotRepository,
    IServicePriceRepository,
)
from apps.server.domain.services import TAVERN_SERVICES
from apps.server.domain.towns import get_town, town_catalog
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError

_NICK_MIN, _NICK_MAX = 2, 16


@dataclass(frozen=True, slots=True)
class CharacterServiceInput:
    """Identifica usuário, conta e personagem para a execução de serviços no jogo.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    username: str
    login: str
    char_id: int
    request_key: UUID | None = None


class ChangeNicknameUseCase(UseCase[tuple[CharacterServiceInput, str], None]):
    """Verifica acesso e nome, reserva o saldo e então altera o personagem.

    A reserva é durável antes da chamada ao jogo. Respostas incertas exigem conciliação;
    repetir a chave não reaplica a operação nem cobra novamente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``tuple[CharacterServiceInput,
    str]``. O retorno é ``None``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        operations: ICharacterServiceOperationRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._operations = operations
        self._unit_of_work = unit_of_work

    def execute(self, data: tuple[CharacterServiceInput, str]) -> None:
        actor, name = data
        self._assert_access(actor)
        cleaned = name.strip()
        if not cleaned.isalnum() or not (_NICK_MIN <= len(cleaned) <= _NICK_MAX):
            raise ValidationDomainError("Nick inválido. Use 2 a 16 letras ou números.")
        price = self._prices.get_price("CHANGE_NICKNAME")
        execute_paid_service(
            actor,
            service="CHANGE_NICKNAME",
            value=cleaned,
            price=price,
            lineage=self._lineage,
            access=self._access,
            wallets=self._wallets,
            operations=self._operations,
            unit_of_work=self._unit_of_work,
        )

    def _assert_access(self, actor: CharacterServiceInput) -> None:
        if not self._access.can_access(actor.user_id, actor.username, actor.login):
            raise AuthorizationError()


class ChangeSexUseCase(UseCase[tuple[CharacterServiceInput, str], None]):
    """Verifica acesso e sexo, reserva o saldo e então chama o gateway.

    Repetições são deduplicadas; uma resposta incerta mantém a reserva para conciliação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``tuple[CharacterServiceInput,
    str]``. O retorno é ``None``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        operations: ICharacterServiceOperationRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._operations = operations
        self._unit_of_work = unit_of_work

    def execute(self, data: tuple[CharacterServiceInput, str]) -> None:
        actor, sex_label = data
        if not self._access.can_access(actor.user_id, actor.username, actor.login):
            raise AuthorizationError()
        sex = 0 if sex_label.upper() == "M" else 1
        if sex_label.upper() not in {"M", "F"}:
            raise ValidationDomainError("Sexo deve ser M ou F.")
        price = self._prices.get_price("CHANGE_SEX")
        execute_paid_service(
            actor,
            service="CHANGE_SEX",
            value=str(sex),
            price=price,
            lineage=self._lineage,
            access=self._access,
            wallets=self._wallets,
            operations=self._operations,
            unit_of_work=self._unit_of_work,
        )


class UnstuckCharacterUseCase(UseCase[CharacterServiceInput, None]):
    """Reposiciona um personagem por meio do gateway após verificar acesso à conta.

    Chame execute com CharacterServiceInput. Este serviço não debita a carteira;
    ListServicePricesUseCase informa UNSTUCK como gratuito. O gateway verifica as condições do
    personagem e o retorno é None.
    """

    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: CharacterServiceInput) -> None:
        if not self._access.can_access(data.user_id, data.username, data.login):
            raise AuthorizationError()
        self._lineage.unstuck(data.login, data.char_id)


@dataclass(frozen=True, slots=True)
class PurchaseLinkSlotInput:
    """Dados de entrada de ``PurchaseLinkSlotUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    quantity: int


class ListServicePricesUseCase(UseCase[None, dict]):
    """Lista preços, destinos e serviços da taverna disponíveis neste servidor.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``dict``.
    """

    def __init__(self, prices: IServicePriceRepository, lineage: ILineageGateway) -> None:
        self._prices = prices
        self._lineage = lineage

    def execute(self, data: None = None) -> dict:
        rows = {row.code: row for row in self._prices.list_all()}
        payload = {
            "CHANGE_NICKNAME": str(self._prices.get_price("CHANGE_NICKNAME")),
            "CHANGE_SEX": str(self._prices.get_price("CHANGE_SEX")),
            "LINK_SLOT": str(self._prices.get_price("LINK_SLOT")),
            "UNSTUCK": "0.00",
            "available": ["CHANGE_NICKNAME", "CHANGE_SEX", "UNSTUCK", "LINK_SLOT"],
            "catalog": {"towns": town_catalog(), "appearance": appearance_catalog()},
        }
        for code in TAVERN_SERVICES:
            if not self._lineage.supports(code):
                continue
            row = rows.get(code)
            if row is not None and not row.active:
                continue
            payload[code] = str(row.price if row else self._prices.get_price(code))
            payload["available"].append(code)
        return payload


def _require_priced_service(prices: IServicePriceRepository, lineage: ILineageGateway, code: str):
    if not lineage.supports(code):
        raise CharacterServiceUnavailableError()
    row = next((item for item in prices.list_all() if item.code == code), None)
    if row is not None and not row.active:
        raise CharacterServiceUnavailableError()
    return prices.get_price(code)


class PurchaseLinkSlotUseCase(UseCase[PurchaseLinkSlotInput, dict]):
    """Compra de 1 a 10 slots adicionais para vincular contas Lineage.

    Recebe PurchaseLinkSlotInput, calcula o preço total, debita a carteira e acrescenta os slots
    dentro do mesmo UnitOfWork. Retorna extra_slots e paid.
    """

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


class TeleportCharacterUseCase(UseCase[tuple[CharacterServiceInput, str], None]):
    """Cobra o teleporte e move o personagem offline para a vila escolhida."""

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        operations: ICharacterServiceOperationRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._operations = operations
        self._unit_of_work = unit_of_work

    def execute(self, data: tuple[CharacterServiceInput, str]) -> None:
        actor, town_code = data
        if not self._access.can_access(actor.user_id, actor.username, actor.login):
            raise AuthorizationError()
        town = get_town(town_code)
        price = _require_priced_service(self._prices, self._lineage, "TELEPORT")
        execute_paid_service(
            actor,
            service="TELEPORT",
            value=town.code,
            price=price,
            lineage=self._lineage,
            access=self._access,
            wallets=self._wallets,
            operations=self._operations,
            unit_of_work=self._unit_of_work,
        )


class ChangeAppearanceUseCase(UseCase[tuple[CharacterServiceInput, str], None]):
    """Cobra e altera cabelo, cor e rosto do personagem offline."""

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        operations: ICharacterServiceOperationRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._operations = operations
        self._unit_of_work = unit_of_work

    def execute(self, data: tuple[CharacterServiceInput, str]) -> None:
        actor, raw = data
        if not self._access.can_access(actor.user_id, actor.username, actor.login):
            raise AuthorizationError()
        char = self._lineage.get_character(actor.login, actor.char_id)
        if char is None:
            raise ValidationDomainError("Personagem não encontrado.")
        hair_style, hair_color, face = parse_appearance(raw, char.sex)
        price = _require_priced_service(self._prices, self._lineage, "APPEARANCE")
        execute_paid_service(
            actor,
            service="APPEARANCE",
            value=appearance_value(hair_style, hair_color, face),
            price=price,
            lineage=self._lineage,
            access=self._access,
            wallets=self._wallets,
            operations=self._operations,
            unit_of_work=self._unit_of_work,
        )


class ClearKarmaUseCase(UseCase[CharacterServiceInput, None]):
    """Cobra e zera o karma do personagem offline."""

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        operations: ICharacterServiceOperationRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._operations = operations
        self._unit_of_work = unit_of_work

    def execute(self, data: CharacterServiceInput) -> None:
        if not self._access.can_access(data.user_id, data.username, data.login):
            raise AuthorizationError()
        price = _require_priced_service(self._prices, self._lineage, "CLEAR_KARMA")
        execute_paid_service(
            data,
            service="CLEAR_KARMA",
            value="",
            price=price,
            lineage=self._lineage,
            access=self._access,
            wallets=self._wallets,
            operations=self._operations,
            unit_of_work=self._unit_of_work,
        )


class ClearPkUseCase(UseCase[CharacterServiceInput, None]):
    """Cobra e zera a contagem de PK do personagem offline."""

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        prices: IServicePriceRepository,
        wallets: IWalletRepository,
        operations: ICharacterServiceOperationRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._prices = prices
        self._wallets = wallets
        self._operations = operations
        self._unit_of_work = unit_of_work

    def execute(self, data: CharacterServiceInput) -> None:
        if not self._access.can_access(data.user_id, data.username, data.login):
            raise AuthorizationError()
        price = _require_priced_service(self._prices, self._lineage, "CLEAR_PK")
        execute_paid_service(
            data,
            service="CLEAR_PK",
            value="",
            price=price,
            lineage=self._lineage,
            access=self._access,
            wallets=self._wallets,
            operations=self._operations,
            unit_of_work=self._unit_of_work,
        )
