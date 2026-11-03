from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from django.db.models import F, Max, Q
from django.utils import timezone

from apps.payment.domain.entities import PaymentAttemptEntity, PaymentOrderEntity
from apps.payment.domain.repositories import (
    IPaymentAttemptRepository,
    IPaymentOrderRepository,
    IPaymentReversalRepository,
    IWebhookLogRepository,
)
from apps.payment.infrastructure.models import (
    PaymentAttempt,
    PaymentReversal,
    PedidoPagamento,
    WebhookLog,
)


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
            refunded_amount=row.refunded_amount,
            coins_reversed=row.coins_reversed,
            bonus_reversed=row.bonus_reversed,
            reversal_shortfall=row.reversal_shortfall,
            review_status=row.review_status,
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
        # Referências de tentativas anteriores também identificam o pedido: uma aprovação ou
        # um estorno tardio da cobrança antiga não pode ficar sem conciliação.
        row = (
            PedidoPagamento.objects.select_related("user")
            .filter(Q(external_id=external_id) | Q(attempts__external_id=external_id))
            .distinct()
            .first()
        )
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

    def _scrub_payment_secrets(self, row: PedidoPagamento) -> list[str]:
        """Remove ``client_secret`` e códigos PIX/boleto após o pedido encerrar."""

        fields = ["client_secret"]
        row.client_secret = ""
        gateway_data = dict(row.gateway_data or {})
        removed = False
        for key in ("pix_qr_code", "pix_qr_code_base64", "boleto_barcode"):
            if key in gateway_data:
                gateway_data.pop(key, None)
                removed = True
        if removed:
            row.gateway_data = gateway_data
            fields.append("gateway_data")
        return fields

    def mark_cancelled(self, order_id: UUID) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).get(id=order_id)
        if row.status not in {"pending", "processing"}:
            return self.to_entity(row)
        row.status = PedidoPagamento.Status.CANCELLED
        fields = ["status", "updated_at", *self._scrub_payment_secrets(row)]
        row.save(update_fields=fields)
        return self.to_entity(row)

    def mark_failed(self, order_id: UUID) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).get(id=order_id)
        if row.status not in {"pending", "processing"}:
            return self.to_entity(row)
        row.status = PedidoPagamento.Status.FAILED
        fields = ["status", "updated_at", *self._scrub_payment_secrets(row)]
        row.save(update_fields=fields)
        return self.to_entity(row)

    def mark_confirmed(self, order_id: UUID, *, bonus_applied: Decimal, total_credited: Decimal) -> PaymentOrderEntity:
        row = PedidoPagamento.objects.select_related("user").select_for_update(of=("self",)).get(id=order_id)
        row.status = PedidoPagamento.Status.CONFIRMED
        row.bonus_applied = bonus_applied
        row.total_credited = total_credited
        row.paid_at = timezone.now()
        fields = [
            "status",
            "bonus_applied",
            "total_credited",
            "paid_at",
            "updated_at",
            *self._scrub_payment_secrets(row),
        ]
        row.save(update_fields=fields)
        return self.to_entity(row)

    def apply_reversal(
        self,
        order_id: UUID,
        *,
        refunded_amount: Decimal,
        coins_reversed: Decimal,
        bonus_reversed: Decimal,
        shortfall_increment: Decimal,
    ) -> PaymentOrderEntity:
        PedidoPagamento.objects.filter(id=order_id).update(
            refunded_amount=refunded_amount,
            coins_reversed=coins_reversed,
            bonus_reversed=bonus_reversed,
            reversal_shortfall=F("reversal_shortfall") + shortfall_increment,
            updated_at=timezone.now(),
        )
        return self.to_entity(PedidoPagamento.objects.select_related("user").get(id=order_id))

    def set_review_status(self, order_id: UUID, review_status: str) -> PaymentOrderEntity:
        PedidoPagamento.objects.filter(id=order_id).update(review_status=review_status, updated_at=timezone.now())
        return self.to_entity(PedidoPagamento.objects.select_related("user").get(id=order_id))


class DjangoPaymentAttemptRepository(IPaymentAttemptRepository):
    """Adaptador Django de ``IPaymentAttemptRepository``; o chamador mantém o pedido bloqueado."""

    @staticmethod
    def _entity(row: PaymentAttempt) -> PaymentAttemptEntity:
        return PaymentAttemptEntity(
            id=row.id,
            order_id=row.order.id,
            number=row.number,
            idempotency_key=row.idempotency_key,
            external_id=row.external_id,
            status=row.status,
        )

    def current(self, order_id: UUID) -> PaymentAttemptEntity | None:
        row = PaymentAttempt.objects.select_related("order").filter(order__id=order_id).order_by("-number").first()
        return self._entity(row) if row else None

    def open(self, order_id: UUID) -> PaymentAttemptEntity:
        order = PedidoPagamento.objects.get(id=order_id)
        number = (order.attempts.aggregate(top=Max("number"))["top"] or 0) + 1
        row = PaymentAttempt.objects.create(order=order, number=number)
        if order.status == PedidoPagamento.Status.FAILED:
            order.status = PedidoPagamento.Status.PROCESSING
            order.save(update_fields=["status", "updated_at"])
        return self._entity(row)

    def record(self, attempt_id: UUID, *, status: str, external_id: str = "") -> PaymentAttemptEntity:
        row = PaymentAttempt.objects.select_related("order").get(id=attempt_id)
        row.status = status
        if external_id:
            row.external_id = external_id
        row.save(update_fields=["status", "external_id", "updated_at"])
        return self._entity(row)

    def owns_external_id(self, order_id: UUID, external_id: str) -> bool:
        if not external_id:
            return False
        return PedidoPagamento.objects.filter(
            Q(external_id=external_id) | Q(attempts__external_id=external_id), id=order_id
        ).exists()

    def record_alias(self, order_id: UUID, external_id: str, *, status: str) -> None:
        if not external_id or self.owns_external_id(order_id, external_id):
            return
        order = PedidoPagamento.objects.get(id=order_id)
        number = (order.attempts.aggregate(top=Max("number"))["top"] or 0) + 1
        PaymentAttempt.objects.create(order=order, number=number, external_id=external_id, status=status)


class DjangoPaymentReversalRepository(IPaymentReversalRepository):
    """Adaptador Django de ``IPaymentReversalRepository``."""

    def exists(self, event_key: str) -> bool:
        return PaymentReversal.objects.filter(event_key=event_key).exists()

    def record(
        self,
        order_id: UUID,
        *,
        event_key: str,
        kind: str,
        refunded_total: Decimal,
        coins_debited: Decimal = Decimal(0),
        bonus_debited: Decimal = Decimal(0),
        shortfall: Decimal = Decimal(0),
    ) -> None:
        PaymentReversal.objects.create(
            order=PedidoPagamento.objects.get(id=order_id),
            event_key=event_key[:200],
            kind=kind,
            refunded_total=refunded_total,
            coins_debited=coins_debited,
            bonus_debited=bonus_debited,
            shortfall=shortfall,
        )
