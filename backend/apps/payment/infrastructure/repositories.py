from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import UUID

from django.utils import timezone

from apps.payment.domain.entities import PaymentOrderEntity
from apps.payment.domain.repositories import IPaymentOrderRepository
from apps.payment.infrastructure.models import PedidoPagamento


class DjangoPaymentOrderRepository(IPaymentOrderRepository):
    def _entity(self, row: PedidoPagamento) -> PaymentOrderEntity:
        return PaymentOrderEntity(
            id=row.id,
            user_id=row.user.id,
            amount=row.amount,
            coins=row.coins,
            method=row.method,
            status=row.status,
            external_id=row.external_id,
            checkout_url=row.checkout_url,
            bonus_applied=row.bonus_applied,
            total_credited=row.total_credited,
        )

    def get_by_id(self, order_id: UUID) -> PaymentOrderEntity | None:
        row = PedidoPagamento.objects.select_related("user").filter(id=order_id).first()
        return self._entity(row) if row else None

    def list_by_user(self, user_id: UUID) -> list[PaymentOrderEntity]:
        rows = PedidoPagamento.objects.select_related("user").filter(user__id=user_id)
        return [self._entity(row) for row in rows]

    def find_reusable(self, user_id: UUID, amount: Decimal, method: str, hours: int) -> PaymentOrderEntity | None:
        cutoff = timezone.now() - timedelta(hours=hours)
        row = (
            PedidoPagamento.objects.select_related("user")
            .filter(
                user__id=user_id,
                amount=amount,
                method=method,
                status=PedidoPagamento.Status.PENDING,
                created_at__gte=cutoff,
            )
            .first()
        )
        return self._entity(row) if row else None

    def create(
        self,
        user_id: UUID,
        *,
        amount: Decimal,
        coins: Decimal,
        method: str,
        external_id: str,
        checkout_url: str,
    ) -> PaymentOrderEntity:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        row = PedidoPagamento.objects.create(
            user=user,
            amount=amount,
            coins=coins,
            method=method,
            external_id=external_id,
            checkout_url=checkout_url,
        )
        return self._entity(row)

    def update_checkout(self, order_id: UUID, *, external_id: str, checkout_url: str) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").get(id=order_id)
        row.external_id = external_id
        row.checkout_url = checkout_url
        row.save(update_fields=["external_id", "checkout_url", "updated_at"])
        return self._entity(row)

    def mark_cancelled(self, order_id: UUID) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update().get(id=order_id)
        row.status = PedidoPagamento.Status.CANCELLED
        row.save(update_fields=["status", "updated_at"])
        return self._entity(row)

    def mark_confirmed(self, order_id: UUID, *, bonus_applied: Decimal, total_credited: Decimal) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update().get(id=order_id)
        row.status = PedidoPagamento.Status.CONFIRMED
        row.bonus_applied = bonus_applied
        row.total_credited = total_credited
        row.save(update_fields=["status", "bonus_applied", "total_credited", "updated_at"])
        return self._entity(row)
