from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.utils import timezone

from apps.payment.domain.entities import PaymentOrderEntity
from apps.payment.domain.repositories import (
    IPaymentOrderRepository,
    IWebhookLogRepository,
)
from apps.payment.infrastructure.models import PedidoPagamento, WebhookLog


class DjangoWebhookLogRepository(IWebhookLogRepository):
    """Persiste ``WebhookLog`` via ORM Django."""

    def create(self, *, kind: str, data_id: str, payload: dict | Any) -> None:
        WebhookLog.objects.create(kind=kind, data_id=data_id, payload=payload)


class DjangoPaymentOrderRepository(IPaymentOrderRepository):
    """Adaptador Django de ``IPaymentOrderRepository`` para pedidos de pagamento, referências
    externas e estado de liquidação.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork. ``order_rows`` devolve QuerySet ordenado para paginação DRF.
    """

    def to_entity(self, row: PedidoPagamento) -> PaymentOrderEntity:
        return PaymentOrderEntity(
            id=row.id,
            user_id=row.user.id,
            amount=row.amount,
            coins=row.coins,
            currency=row.currency,
            package_code=row.package_code,
            method=row.method,
            status=row.status,
            external_id=row.external_id,
            checkout_url=row.checkout_url,
            client_secret=row.client_secret,
            bonus_applied=row.bonus_applied,
            total_credited=row.total_credited,
            gateway_data=row.gateway_data or {},
            created_at=row.created_at,
            paid_at=row.paid_at,
        )

    def order_rows(self, user_id: UUID):
        """QuerySet dos pedidos do usuário ordenados do mais recente ao mais antigo."""

        return PedidoPagamento.objects.select_related("user").filter(user__id=user_id).order_by("-created_at")

    def get_by_id(self, order_id: UUID) -> PaymentOrderEntity | None:
        row = PedidoPagamento.objects.select_related("user").filter(id=order_id).first()
        return self.to_entity(row) if row else None

    def get_by_external_id(self, external_id: str) -> PaymentOrderEntity | None:
        if not external_id:
            return None
        row = PedidoPagamento.objects.select_related("user").filter(external_id=external_id).first()
        return self.to_entity(row) if row else None

    def get_for_update(self, order_id: UUID) -> PaymentOrderEntity | None:
        """Serializa liquidação/cancelamento bloqueando só o pedido, sem bloquear o usuário."""
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).filter(id=order_id).first()
        return self.to_entity(row) if row else None

    def list_by_user(self, user_id: UUID) -> list[PaymentOrderEntity]:
        return [self.to_entity(row) for row in self.order_rows(user_id)]

    def find_reusable(
        self,
        user_id: UUID,
        amount: Decimal,
        method: str,
        hours: int,
        *,
        currency: str,
        package_code: str,
    ) -> PaymentOrderEntity | None:
        cutoff = timezone.now() - timedelta(hours=hours)
        row = (
            PedidoPagamento.objects.select_related("user")
            .filter(
                user__id=user_id,
                amount=amount,
                method=method,
                currency=currency,
                package_code=package_code,
                status=PedidoPagamento.Status.PENDING,
                created_at__gte=cutoff,
            )
            .first()
        )
        return self.to_entity(row) if row else None

    def create(
        self,
        user_id: UUID,
        *,
        amount: Decimal,
        coins: Decimal,
        method: str,
        currency: str,
        package_code: str,
        external_id: str,
        checkout_url: str,
        client_secret: str = "",
    ) -> PaymentOrderEntity:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        row = PedidoPagamento.objects.create(
            user=user,
            amount=amount,
            coins=coins,
            method=method,
            currency=currency,
            package_code=package_code,
            external_id=external_id,
            checkout_url=checkout_url,
            client_secret=client_secret,
        )
        return self.to_entity(row)

    def update_checkout(
        self,
        order_id: UUID,
        *,
        external_id: str,
        checkout_url: str,
        client_secret: str = "",
        gateway_data: dict | None = None,
        status: str | None = None,
    ) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).get(id=order_id)
        if row.status not in {"pending", "processing"}:
            return self.to_entity(row)
        row.external_id = external_id
        row.checkout_url = checkout_url
        if client_secret:
            row.client_secret = client_secret
        if gateway_data is not None:
            row.gateway_data = gateway_data
        if status:
            row.status = status
        fields = ["external_id", "checkout_url", "client_secret", "gateway_data", "updated_at"]
        if status:
            fields.append("status")
        row.save(update_fields=fields)
        return self.to_entity(row)

    def mark_cancelled(self, order_id: UUID) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).get(id=order_id)
        if row.status not in {"pending", "processing"}:
            return self.to_entity(row)
        row.status = PedidoPagamento.Status.CANCELLED
        row.save(update_fields=["status", "updated_at"])
        return self.to_entity(row)

    def mark_failed(self, order_id: UUID) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).get(id=order_id)
        if row.status not in {"pending", "processing"}:
            return self.to_entity(row)
        row.status = PedidoPagamento.Status.FAILED
        row.save(update_fields=["status", "updated_at"])
        return self.to_entity(row)

    def mark_confirmed(self, order_id: UUID, *, bonus_applied: Decimal, total_credited: Decimal) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).get(id=order_id)
        row.status = PedidoPagamento.Status.CONFIRMED
        row.bonus_applied = bonus_applied
        row.total_credited = total_credited
        row.paid_at = timezone.now()
        row.save(update_fields=["status", "bonus_applied", "total_credited", "paid_at", "updated_at"])
        return self.to_entity(row)
