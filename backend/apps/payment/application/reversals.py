"""Conciliação idempotente de estornos, chargebacks e disputas (LBN-04).

Política aplicada:

- reembolso (parcial ou total) e chargeback retiram moedas e bônus na proporção do valor
  efetivamente devolvido pelo provedor, sobre os totais acumulados do pedido;
- quando o jogador já gastou ou transferiu o saldo, debita-se o que houver e o restante fica
  registrado como saldo devedor do pedido, que passa a exigir revisão manual da equipe;
- disputa aberta não retira saldo: marca o pedido para revisão e aguarda o desfecho; disputa
  perdida equivale a chargeback total; disputa ganha encerra a revisão quando não há devedor;
- cada evento do provedor tem ``event_key`` único; totais devolvidos nunca regridem nem
  ultrapassam o valor do pedido, então eventos repetidos ou fora de ordem não revertem duas vezes.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from decimal import ROUND_DOWN, Decimal
from uuid import UUID

from apps.payment.domain.entities import PaymentOrderEntity
from apps.payment.domain.repositories import (
    IPaymentOrderRepository,
    IPaymentReversalRepository,
)
from apps.wallet.domain.coins import floor_coins
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError

logger = logging.getLogger(__name__)

REVERSAL_KINDS = frozenset({"refund", "chargeback", "dispute_opened", "dispute_won", "dispute_lost"})
_CENT = Decimal("0.01")


@dataclass(frozen=True, slots=True)
class ReconcilePaymentReversalInput:
    """Evento financeiro já autenticado (assinatura ou consulta ao provedor).

    ``refunded_total`` é o total acumulado devolvido informado pelo provedor, na moeda do
    pedido; é ignorado em disputas e substituído pelo valor integral em chargeback.
    """

    order_id: UUID
    event_key: str
    kind: str
    refunded_total: Decimal = Decimal(0)


class ReconcilePaymentReversalUseCase(UseCase[ReconcilePaymentReversalInput, PaymentOrderEntity | None]):
    """Aplica um estorno, chargeback ou desfecho de disputa a um pedido, uma única vez.

    Uso: resolva pelo container e chame ``execute(data)``. Bloqueia o pedido, debita a carteira
    com descrição rastreável no extrato e grava o evento em ``IPaymentReversalRepository``.
    Retorna None quando o pedido não existe.
    """

    def __init__(
        self,
        orders: IPaymentOrderRepository,
        reversals: IPaymentReversalRepository,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._orders = orders
        self._reversals = reversals
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: ReconcilePaymentReversalInput) -> PaymentOrderEntity | None:
        if data.kind not in REVERSAL_KINDS or not data.event_key:
            raise ValidationDomainError("Evento financeiro inválido.")
        with self._unit_of_work:
            order = self._orders.get_for_update(data.order_id)
            if order is None:
                return None
            if self._reversals.exists(data.event_key):
                return order
            if order.status != "confirmed":
                # Nada foi creditado: o evento fica no histórico sem movimentar a carteira.
                self._reversals.record(order.id, event_key=data.event_key, kind=data.kind, refunded_total=Decimal(0))
                return order
            if data.kind == "dispute_opened":
                self._reversals.record(order.id, event_key=data.event_key, kind=data.kind, refunded_total=order.refunded_amount)
                if order.review_status != "manual_review":
                    order = self._orders.set_review_status(order.id, "dispute")
                return order
            if data.kind == "dispute_won":
                self._reversals.record(order.id, event_key=data.event_key, kind=data.kind, refunded_total=order.refunded_amount)
                if order.review_status == "dispute" and order.reversal_shortfall <= 0:
                    order = self._orders.set_review_status(order.id, "")
                return order
            return self._reverse(order, data)

    def _reverse(self, order: PaymentOrderEntity, data: ReconcilePaymentReversalInput) -> PaymentOrderEntity:
        full = data.kind in {"chargeback", "dispute_lost"}
        reported = order.amount if full else min(max(data.refunded_total, Decimal(0)), order.amount)
        target = max(reported, order.refunded_amount)
        if target <= order.refunded_amount or order.amount <= 0:
            self._reversals.record(order.id, event_key=data.event_key, kind=data.kind, refunded_total=reported)
            return order
        ratio = target / order.amount
        coins_target = order.coins if ratio >= 1 else floor_coins(order.coins * ratio)
        bonus_target = order.bonus_applied if ratio >= 1 else (order.bonus_applied * ratio).quantize(_CENT, ROUND_DOWN)
        coins_due = max(coins_target - order.coins_reversed, Decimal(0))
        bonus_due = max(bonus_target - order.bonus_reversed, Decimal(0))
        wallet = self._wallets.get_or_create(order.user_id)
        take_coins = min(coins_due, max(wallet.balance, Decimal(0)))
        take_bonus = min(bonus_due, max(wallet.bonus_balance, Decimal(0)))
        label = "Chargeback" if full else "Estorno"
        if take_coins > 0:
            self._wallets.debit(
                wallet.id, take_coins, destination="payment_reversal",
                description=f"{label} do pedido {order.id}",
            )
        if take_bonus > 0:
            self._wallets.debit_bonus(
                wallet.id, take_bonus, destination="payment_reversal",
                description=f"{label} do pedido {order.id} (bônus)",
            )
        shortfall = (coins_due - take_coins) + (bonus_due - take_bonus)
        updated = self._orders.apply_reversal(
            order.id,
            refunded_amount=target,
            coins_reversed=coins_target,
            bonus_reversed=bonus_target,
            shortfall_increment=shortfall,
        )
        if shortfall > 0:
            updated = self._orders.set_review_status(order.id, "manual_review")
            logger.warning(
                "Estorno com saldo devedor: pedido=%s devedor=%s",
                order.id,
                shortfall,
                extra={"event": "payment.reversal_shortfall", "payment_order_id": str(order.id)},
            )
        elif data.kind == "dispute_lost" and updated.review_status == "dispute":
            updated = self._orders.set_review_status(order.id, "")
        self._reversals.record(
            order.id,
            event_key=data.event_key,
            kind=data.kind,
            refunded_total=reported,
            coins_debited=take_coins,
            bonus_debited=take_bonus,
            shortfall=shortfall,
        )
        return updated
