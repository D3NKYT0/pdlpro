from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Sum

from apps.programs.domain.exceptions import (
    InvalidProgramActionError,
    PayoutNotFoundError,
    ResourceNotFoundError,
    RoadmapEntryNotFoundError,
    SupporterNotFoundError,
)
from apps.programs.models import (
    Commission,
    CommissionPayout,
    RoadmapEntry,
    Supporter,
    SystemResource,
)
from apps.shop.infrastructure.models import PromotionCode
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

    def execute(self, data: UserScopedInput) -> dict:
        row = Supporter.objects.filter(user__id=data.user_id).first()
        if not row:
            return {
                "profile": None,
                "available": "0.00",
                "coupons": [],
                "payouts": [],
                "commissions": [],
            }
        commissions = Commission.objects.filter(supporter=row)
        return {
            "profile": row,
            "available": str(
                commissions.filter(payout__isnull=True).aggregate(total=Sum("amount"))["total"]
                or 0
            ),
            "coupons": list(
                PromotionCode.objects.filter(supporter=row).values(
                    "code", "percent", "active", "uses"
                )
            ),
            "commissions": [
                {
                    "id": str(c.id),
                    "amount": str(c.amount),
                    "created_at": c.created_at,
                    "status": c.payout.status if c.payout else "available",
                }
                for c in commissions.select_related("payout")[:100]
            ],
            "payouts": list(row.payouts.all()[:100]),
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

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: UpsertSupporterInput) -> dict:
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            row = Supporter.objects.filter(user=user).first()
            status = (
                "pending"
                if not row or row.status == "rejected"
                else row.status
            )
            if row is None:
                row = Supporter(user=user)
            for key, value in data.validated_data.items():
                setattr(row, key, value)
            row.status = status
            row.save()
        return GetSupporterDashboardUseCase().execute(UserScopedInput(user_id=data.user_id))


class RequestCommissionPayoutUseCase(UseCase[UserScopedInput, CommissionPayout]):
    """Solicita o repasse das comissões disponíveis do apoiador aprovado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UserScopedInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: UserScopedInput) -> CommissionPayout:
        with self._unit_of_work:
            supporter = (
                Supporter.objects.select_for_update()
                .filter(user__id=data.user_id, status="approved")
                .first()
            )
            if not supporter:
                raise InvalidProgramActionError("Seu cadastro precisa estar aprovado.")
            rows = Commission.objects.filter(supporter=supporter, payout__isnull=True)
            amount = rows.aggregate(total=Sum("amount"))["total"] or Decimal(0)
            if amount <= 0:
                raise InvalidProgramActionError("Não há comissões disponíveis para solicitar.")
            payout = CommissionPayout.objects.create(supporter=supporter, amount=amount)
            rows.update(payout=payout)
            return payout


class ListStaffSupportersUseCase(UseCase[None, dict]):
    """Lista apoiadores e pedidos de repasse recentes para a equipe.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def execute(self, data: None = None) -> dict:
        return {
            "supporters": list(Supporter.objects.select_related("user").all()),
            "payouts": list(
                CommissionPayout.objects.select_related("supporter").all()[:200]
            ),
        }


@dataclass(frozen=True, slots=True)
class ReviewSupporterInput:
    """Dados da revisão administrativa de um apoiador."""

    entry_id: UUID
    status: str
    review_note: str
    commission_percent: Decimal


class ReviewSupporterUseCase(UseCase[ReviewSupporterInput, Supporter]):
    """Atualiza status/condições do apoiador e ajusta o papel do usuário quando aplicável.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ReviewSupporterInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: ReviewSupporterInput) -> Supporter:
        with self._unit_of_work:
            row = Supporter.objects.select_for_update().filter(id=data.entry_id).first()
            if row is None:
                raise SupporterNotFoundError()
            row.status = data.status
            row.review_note = data.review_note
            row.commission_percent = data.commission_percent
            row.save()
            user = row.user
            if row.status == "approved" and user.role == "player":
                type(user).objects.filter(pk=user.pk, role="player").update(role="supporter")
            elif row.status == "rejected" and user.role == "supporter":
                type(user).objects.filter(pk=user.pk, role="supporter").update(role="player")
            return row


@dataclass(frozen=True, slots=True)
class ReviewPayoutInput:
    """Dados da revisão de um pedido de repasse."""

    payout_id: UUID
    status: str
    note: str


class ReviewPayoutUseCase(UseCase[ReviewPayoutInput, CommissionPayout]):
    """Aprova (creditando carteira) ou rejeita um pedido de repasse pendente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ReviewPayoutInput``.
    """

    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: ReviewPayoutInput) -> CommissionPayout:
        with self._unit_of_work:
            payout = (
                CommissionPayout.objects.select_for_update()
                .select_related("supporter__user")
                .filter(id=data.payout_id)
                .first()
            )
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
                Commission.objects.filter(payout=payout).update(payout=None)
            else:
                raise InvalidProgramActionError("Decisão inválida.")
            payout.status = data.status
            payout.note = data.note
            payout.save()
            return payout


@dataclass(frozen=True, slots=True)
class GetRoadmapInput:
    """Consulta pública do roadmap; ``entry_id`` opcional restringe a uma entrada."""

    entry_id: UUID | None = None


class ListPublishedRoadmapUseCase(UseCase[GetRoadmapInput, list[RoadmapEntry] | RoadmapEntry]):
    """Lista ou obtém entradas publicadas do roadmap.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetRoadmapInput``.
    """

    def execute(self, data: GetRoadmapInput) -> list[RoadmapEntry] | RoadmapEntry:
        rows = RoadmapEntry.objects.filter(published=True)
        if data.entry_id:
            row = rows.filter(id=data.entry_id).first()
            if row is None:
                raise RoadmapEntryNotFoundError()
            return row
        return list(rows)


class ListStaffRoadmapUseCase(UseCase[None, list[RoadmapEntry]]):
    """Lista todas as entradas do roadmap para a equipe."""

    def execute(self, data: None = None) -> list[RoadmapEntry]:
        return list(RoadmapEntry.objects.all())


@dataclass(frozen=True, slots=True)
class CreateRoadmapInput:
    """Campos validados para criar uma entrada do roadmap."""

    fields: dict


class CreateRoadmapEntryUseCase(UseCase[CreateRoadmapInput, RoadmapEntry]):
    """Cria uma entrada do roadmap."""

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateRoadmapInput) -> RoadmapEntry:
        with self._unit_of_work:
            return RoadmapEntry.objects.create(**data.fields)


@dataclass(frozen=True, slots=True)
class UpdateRoadmapInput:
    """Campos validados para atualizar uma entrada do roadmap."""

    entry_id: UUID
    fields: dict


class UpdateRoadmapEntryUseCase(UseCase[UpdateRoadmapInput, RoadmapEntry]):
    """Atualiza parcialmente uma entrada do roadmap."""

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateRoadmapInput) -> RoadmapEntry:
        with self._unit_of_work:
            row = RoadmapEntry.objects.filter(id=data.entry_id).first()
            if row is None:
                raise RoadmapEntryNotFoundError()
            for key, value in data.fields.items():
                setattr(row, key, value)
            row.save()
            return row


@dataclass(frozen=True, slots=True)
class DeleteRoadmapInput:
    """Identificador da entrada do roadmap a excluir."""

    entry_id: UUID


class DeleteRoadmapEntryUseCase(UseCase[DeleteRoadmapInput, None]):
    """Remove uma entrada do roadmap."""

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: DeleteRoadmapInput) -> None:
        with self._unit_of_work:
            deleted, _ = RoadmapEntry.objects.filter(id=data.entry_id).delete()
            if not deleted:
                raise RoadmapEntryNotFoundError()


class ListResourcesUseCase(UseCase[None, list[SystemResource]]):
    """Lista os recursos do sistema e seu estado de ativação."""

    def execute(self, data: None = None) -> list[SystemResource]:
        return list(SystemResource.objects.all())


@dataclass(frozen=True, slots=True)
class UpdateResourceInput:
    """Campos validados para atualizar um recurso do sistema."""

    entry_id: UUID
    fields: dict


class UpdateResourceUseCase(UseCase[UpdateResourceInput, SystemResource]):
    """Atualiza parcialmente um recurso do sistema."""

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateResourceInput) -> SystemResource:
        with self._unit_of_work:
            row = SystemResource.objects.filter(id=data.entry_id).first()
            if row is None:
                raise ResourceNotFoundError()
            for key, value in data.fields.items():
                setattr(row, key, value)
            row.save()
            return row
