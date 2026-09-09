from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Sum

from apps.programs.domain.repositories import (
    IRoadmapRepository,
    ISupporterRepository,
    ISystemResourceRepository,
)
from apps.programs.models import (
    Commission,
    CommissionPayout,
    RoadmapEntry,
    Supporter,
    SystemResource,
)
from apps.shop.infrastructure.models import PromotionCode

User = get_user_model()


class DjangoSupporterRepository(ISupporterRepository):
    """Adaptador Django de ``ISupporterRepository``."""

    def find_by_user_id(self, user_id: UUID) -> Supporter | None:
        return Supporter.objects.filter(user__id=user_id).first()

    def lock_user(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def find_by_user(self, user: Any) -> Supporter | None:
        return Supporter.objects.filter(user=user).first()

    def save_supporter(self, row: Supporter) -> Supporter:
        row.save()
        return row

    def new_supporter(self, user: Any) -> Supporter:
        return Supporter(user=user)

    def list_available_commission_total(self, supporter: Supporter) -> Decimal:
        total = (
            Commission.objects.filter(supporter=supporter, payout__isnull=True).aggregate(
                total=Sum("amount")
            )["total"]
        )
        return total or Decimal(0)

    def list_coupons(self, supporter: Supporter) -> list[dict]:
        return list(
            PromotionCode.objects.filter(supporter=supporter).values(
                "code", "percent", "active", "uses"
            )
        )

    def list_commissions_with_payout(self, supporter: Supporter, *, limit: int = 100) -> list[Commission]:
        return list(
            Commission.objects.filter(supporter=supporter)
            .select_related("payout")[:limit]
        )

    def list_payouts(self, supporter: Supporter, *, limit: int = 100) -> list[CommissionPayout]:
        return list(supporter.payouts.all()[:limit])

    def lock_approved_by_user_id(self, user_id: UUID) -> Supporter | None:
        return (
            Supporter.objects.select_for_update()
            .filter(user__id=user_id, status="approved")
            .first()
        )

    def available_commissions(self, supporter: Supporter):
        return Commission.objects.filter(supporter=supporter, payout__isnull=True)

    def create_payout(self, supporter: Supporter, amount: Decimal) -> CommissionPayout:
        return CommissionPayout.objects.create(supporter=supporter, amount=amount)

    def assign_commissions_to_payout(self, commissions, payout: CommissionPayout) -> None:
        commissions.update(payout=payout)

    def list_all_with_user(self) -> list[Supporter]:
        return list(Supporter.objects.select_related("user").all())

    def list_recent_payouts(self, *, limit: int = 200) -> list[CommissionPayout]:
        return list(CommissionPayout.objects.select_related("supporter").all()[:limit])

    def lock_by_id(self, entry_id: UUID) -> Supporter | None:
        return Supporter.objects.select_for_update().filter(id=entry_id).first()

    def update_user_role(self, user: Any, *, from_role: str, to_role: str) -> None:
        type(user).objects.filter(pk=user.pk, role=from_role).update(role=to_role)

    def lock_payout(self, payout_id: UUID) -> CommissionPayout | None:
        return (
            CommissionPayout.objects.select_for_update()
            .select_related("supporter__user")
            .filter(id=payout_id)
            .first()
        )

    def clear_payout_commissions(self, payout: CommissionPayout) -> None:
        Commission.objects.filter(payout=payout).update(payout=None)

    def save_payout(self, payout: CommissionPayout) -> CommissionPayout:
        payout.save()
        return payout


class DjangoRoadmapRepository(IRoadmapRepository):
    """Adaptador Django de ``IRoadmapRepository``."""

    def list_published(self) -> list[RoadmapEntry]:
        return list(RoadmapEntry.objects.filter(published=True))

    def get_published(self, entry_id: UUID) -> RoadmapEntry | None:
        return RoadmapEntry.objects.filter(published=True, id=entry_id).first()

    def list_all(self) -> list[RoadmapEntry]:
        return list(RoadmapEntry.objects.all())

    def create(self, **fields) -> RoadmapEntry:
        return RoadmapEntry.objects.create(**fields)

    def get_by_id(self, entry_id: UUID) -> RoadmapEntry | None:
        return RoadmapEntry.objects.filter(id=entry_id).first()

    def save(self, row: RoadmapEntry) -> RoadmapEntry:
        row.save()
        return row

    def delete_by_id(self, entry_id: UUID) -> bool:
        deleted, _ = RoadmapEntry.objects.filter(id=entry_id).delete()
        return bool(deleted)


class DjangoSystemResourceRepository(ISystemResourceRepository):
    """Adaptador Django de ``ISystemResourceRepository``."""

    def list_all(self) -> list[SystemResource]:
        return list(SystemResource.objects.all())

    def get_by_id(self, entry_id: UUID) -> SystemResource | None:
        return SystemResource.objects.filter(id=entry_id).first()

    def save(self, row: SystemResource) -> SystemResource:
        row.save()
        return row

    def any_disabled(self, codes: list[str]) -> bool:
        if not codes:
            return False
        return SystemResource.objects.filter(code__in=codes, enabled=False).exists()
