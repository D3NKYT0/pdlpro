from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID

from apps.programs.domain.exceptions import (
    InvalidProgramActionError,
    PayoutNotFoundError,
    ResourceNotFoundError,
    RoadmapEntryNotFoundError,
    SupporterNotFoundError,
)
from apps.programs.domain.repositories import (
    IRoadmapRepository,
    ISupporterRepository,
    ISystemResourceRepository,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase


@dataclass(frozen=True, slots=True)
class UserScopedInput:
    """Entrada com o UUID do usuário autenticado."""

    user_id: UUID


class GetSupporterDashboardUseCase(UseCase[UserScopedInput, dict]):
    """Monta o painel do apoiador (perfil, saldo, cupons, comissões e repasses).

    Uso: resolva pelo container e chame ``execute(data)`` com ``UserScopedInput``.
    """

    def __init__(self, supporters: ISupporterRepository) -> None:
        self._supporters = supporters

    def execute(self, data: UserScopedInput) -> dict:
        row = self._supporters.find_by_user_id(data.user_id)
        if not row:
            return {
                "profile": None,
                "available": "0.00",
                "coupons": [],
                "payouts": [],
                "commissions": [],
            }
        commissions = self._supporters.list_commissions_with_payout(row)
        available = self._supporters.list_available_commission_total(row)
        return {
            "profile": row,
            "available": str(available),
            "coupons": self._supporters.list_coupons(row),
            "commissions": [
                {
                    "id": str(c.id),
                    "amount": str(c.amount),
                    "created_at": c.created_at,
                    "status": c.payout.status if c.payout else "available",
                }
                for c in commissions
            ],
            "payouts": self._supporters.list_payouts(row),
        }


@dataclass(frozen=True, slots=True)
class UpsertSupporterInput:
    """Dados de inscrição/atualização do apoiador."""

    user_id: UUID
    validated_data: dict


class UpsertSupporterUseCase(UseCase[UpsertSupporterInput, dict]):
    """Cria ou atualiza a inscrição de apoiador e devolve o painel atualizado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpsertSupporterInput``.
    """

    def __init__(
        self,
        unit_of_work: UnitOfWork,
        get_dashboard: GetSupporterDashboardUseCase,
        supporters: ISupporterRepository,
    ) -> None:
        self._unit_of_work = unit_of_work
        self._get_dashboard = get_dashboard
        self._supporters = supporters

    def execute(self, data: UpsertSupporterInput) -> dict:
        with self._unit_of_work:
            user = self._supporters.lock_user(data.user_id)
            row = self._supporters.find_by_user(user)
            status = (
                "pending"
                if not row or row.status == "rejected"
                else row.status
            )
            if row is None:
                row = self._supporters.new_supporter(user)
            for key, value in data.validated_data.items():
                setattr(row, key, value)
            row.status = status
            self._supporters.save_supporter(row)
        return self._get_dashboard.execute(UserScopedInput(user_id=data.user_id))


class RequestCommissionPayoutUseCase(UseCase[UserScopedInput, Any]):
    """Solicita o repasse das comissões disponíveis do apoiador aprovado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UserScopedInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork, supporters: ISupporterRepository) -> None:
        self._unit_of_work = unit_of_work
        self._supporters = supporters

    def execute(self, data: UserScopedInput) -> Any:
        with self._unit_of_work:
            supporter = self._supporters.lock_approved_by_user_id(data.user_id)
            if not supporter:
                raise InvalidProgramActionError("Seu cadastro precisa estar aprovado.")
            rows = self._supporters.available_commissions(supporter)
            amount = self._supporters.list_available_commission_total(supporter)
            if amount <= 0:
                raise InvalidProgramActionError("Não há comissões disponíveis para solicitar.")
            payout = self._supporters.create_payout(supporter, amount)
            self._supporters.assign_commissions_to_payout(rows, payout)
            return payout


class ListStaffSupportersUseCase(UseCase[None, dict]):
    """Lista apoiadores e pedidos de repasse recentes para a equipe.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def __init__(self, supporters: ISupporterRepository) -> None:
        self._supporters = supporters

    def execute(self, data: None = None) -> dict:
        return {
            "supporters": self._supporters.list_all_with_user(),
            "payouts": self._supporters.list_recent_payouts(),
        }


@dataclass(frozen=True, slots=True)
class ReviewSupporterInput:
    """Dados da revisão administrativa de um apoiador."""

    entry_id: UUID
    status: str
    review_note: str
    commission_percent: Decimal


class ReviewSupporterUseCase(UseCase[ReviewSupporterInput, Any]):
    """Atualiza status/condições do apoiador e ajusta o papel do usuário quando aplicável.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ReviewSupporterInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork, supporters: ISupporterRepository) -> None:
        self._unit_of_work = unit_of_work
        self._supporters = supporters

    def execute(self, data: ReviewSupporterInput) -> Any:
        with self._unit_of_work:
            row = self._supporters.lock_by_id(data.entry_id)
            if row is None:
                raise SupporterNotFoundError()
            row.status = data.status
            row.review_note = data.review_note
            row.commission_percent = data.commission_percent
            self._supporters.save_supporter(row)
            user = row.user
            if row.status == "approved" and user.role == "player":
                self._supporters.update_user_role(user, from_role="player", to_role="supporter")
            elif row.status == "rejected" and user.role == "supporter":
                self._supporters.update_user_role(user, from_role="supporter", to_role="player")
            return row


@dataclass(frozen=True, slots=True)
class ReviewPayoutInput:
    """Dados da revisão de um pedido de repasse."""

    payout_id: UUID
    status: str
    note: str


class ReviewPayoutUseCase(UseCase[ReviewPayoutInput, Any]):
    """Aprova (creditando carteira) ou rejeita um pedido de repasse pendente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ReviewPayoutInput``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
        supporters: ISupporterRepository,
    ) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work
        self._supporters = supporters

    def execute(self, data: ReviewPayoutInput) -> Any:
        with self._unit_of_work:
            payout = self._supporters.lock_payout(data.payout_id)
            if payout is None:
                raise PayoutNotFoundError()
            if payout.status != "pending":
                raise InvalidProgramActionError("Esta solicitação já foi processada.")
            if data.status == "paid":
                wallet = self._wallets.get_or_create(payout.supporter.user.id)
                self._wallets.credit(
                    wallet.id,
                    payout.amount,
                    origin="supporter_commission",
                    description="Comissão de apoiador aprovada",
                )
            elif data.status == "rejected":
                self._supporters.clear_payout_commissions(payout)
            else:
                raise InvalidProgramActionError("Decisão inválida.")
            payout.status = data.status
            payout.note = data.note
            return self._supporters.save_payout(payout)


@dataclass(frozen=True, slots=True)
class GetRoadmapInput:
    """Consulta pública do roadmap; ``entry_id`` opcional restringe a uma entrada."""

    entry_id: UUID | None = None
    language: str = "pt"


def localize_roadmap_entry(row: Any, language: str = "pt") -> dict:
    """Serializa uma entrada do roadmap com título/descrição no idioma pedido."""

    from apps.programs.serializers import RoadmapSerializer
    from common.i18n import localized_text, resolve_language

    language = resolve_language(language)
    data = dict(RoadmapSerializer(row).data)
    data["title"] = localized_text(row, "title", language)
    data["description"] = localized_text(row, "description", language)
    data["language"] = language
    for key in ("title_en", "title_es", "description_en", "description_es"):
        data.pop(key, None)
    return data


class ListPublishedRoadmapUseCase(UseCase[GetRoadmapInput, list[Any] | Any]):
    """Lista ou obtém entradas publicadas do roadmap.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetRoadmapInput``.
    """

    def __init__(self, roadmap: IRoadmapRepository) -> None:
        self._roadmap = roadmap

    def execute(self, data: GetRoadmapInput) -> list[Any] | Any:
        if data.entry_id:
            row = self._roadmap.get_published(data.entry_id)
            if row is None:
                raise RoadmapEntryNotFoundError()
            return localize_roadmap_entry(row, data.language)
        return [localize_roadmap_entry(row, data.language) for row in self._roadmap.list_published()]


class ListStaffRoadmapUseCase(UseCase[None, list[Any]]):
    """Lista todas as entradas do roadmap para a equipe."""

    def __init__(self, roadmap: IRoadmapRepository) -> None:
        self._roadmap = roadmap

    def execute(self, data: None = None) -> list[Any]:
        return self._roadmap.list_all()


@dataclass(frozen=True, slots=True)
class CreateRoadmapInput:
    """Campos validados para criar uma entrada do roadmap."""

    fields: dict


class CreateRoadmapEntryUseCase(UseCase[CreateRoadmapInput, Any]):
    """Cria uma entrada do roadmap."""

    def __init__(self, unit_of_work: UnitOfWork, roadmap: IRoadmapRepository) -> None:
        self._unit_of_work = unit_of_work
        self._roadmap = roadmap

    def execute(self, data: CreateRoadmapInput) -> Any:
        with self._unit_of_work:
            return self._roadmap.create(**data.fields)


@dataclass(frozen=True, slots=True)
class UpdateRoadmapInput:
    """Campos validados para atualizar uma entrada do roadmap."""

    entry_id: UUID
    fields: dict


class UpdateRoadmapEntryUseCase(UseCase[UpdateRoadmapInput, Any]):
    """Atualiza parcialmente uma entrada do roadmap."""

    def __init__(self, unit_of_work: UnitOfWork, roadmap: IRoadmapRepository) -> None:
        self._unit_of_work = unit_of_work
        self._roadmap = roadmap

    def execute(self, data: UpdateRoadmapInput) -> Any:
        with self._unit_of_work:
            row = self._roadmap.get_by_id(data.entry_id)
            if row is None:
                raise RoadmapEntryNotFoundError()
            for key, value in data.fields.items():
                setattr(row, key, value)
            return self._roadmap.save(row)


@dataclass(frozen=True, slots=True)
class DeleteRoadmapInput:
    """Identificador da entrada do roadmap a excluir."""

    entry_id: UUID


class DeleteRoadmapEntryUseCase(UseCase[DeleteRoadmapInput, None]):
    """Remove uma entrada do roadmap."""

    def __init__(self, unit_of_work: UnitOfWork, roadmap: IRoadmapRepository) -> None:
        self._unit_of_work = unit_of_work
        self._roadmap = roadmap

    def execute(self, data: DeleteRoadmapInput) -> None:
        with self._unit_of_work:
            if not self._roadmap.delete_by_id(data.entry_id):
                raise RoadmapEntryNotFoundError()


class ListResourcesUseCase(UseCase[None, list[Any]]):
    """Lista os recursos do sistema e seu estado de ativação."""

    def __init__(self, resources: ISystemResourceRepository) -> None:
        self._resources = resources

    def execute(self, data: None = None) -> list[Any]:
        return self._resources.list_all()


@dataclass(frozen=True, slots=True)
class UpdateResourceInput:
    """Campos validados para atualizar um recurso do sistema."""

    entry_id: UUID
    fields: dict


class UpdateResourceUseCase(UseCase[UpdateResourceInput, Any]):
    """Atualiza parcialmente um recurso do sistema."""

    def __init__(self, unit_of_work: UnitOfWork, resources: ISystemResourceRepository) -> None:
        self._unit_of_work = unit_of_work
        self._resources = resources

    def execute(self, data: UpdateResourceInput) -> Any:
        with self._unit_of_work:
            row = self._resources.get_by_id(data.entry_id)
            if row is None:
                raise ResourceNotFoundError()
            for key, value in data.fields.items():
                setattr(row, key, value)
            return self._resources.save(row)
