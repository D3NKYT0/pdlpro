from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.conf import settings

from apps.payment.domain.entities import PaymentOrderEntity
from apps.payment.domain.exceptions import (
    InvalidPaymentAmountError,
    PaymentAlreadyConfirmedError,
    PaymentMethodUnavailableError,
    PaymentNotPendingError,
    PaymentOrderNotFoundError,
)
from apps.payment.domain.gateways import IPaymentGateway
from apps.payment.domain.repositories import IPaymentOrderRepository
from apps.wallet.domain.bonus import BonusPreview, IPurchaseBonusPolicy
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError


@dataclass(frozen=True, slots=True)
class PreviewBonusInput:
    amount: Decimal


class PreviewPaymentBonusUseCase(UseCase[PreviewBonusInput, BonusPreview]):
    def __init__(self, bonus_policy: IPurchaseBonusPolicy) -> None:
        self._bonus_policy = bonus_policy

    def execute(self, data: PreviewBonusInput) -> BonusPreview:
        if data.amount <= 0:
            raise InvalidPaymentAmountError()
        return self._bonus_policy.preview(data.amount)


@dataclass(frozen=True, slots=True)
class CreatePaymentOrderInput:
    user_id: UUID
    amount: Decimal
    method: str = "mock"


class CreatePaymentOrderUseCase(UseCase[CreatePaymentOrderInput, PaymentOrderEntity]):
    def __init__(
        self,
        orders: IPaymentOrderRepository,
        gateway: IPaymentGateway,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._orders = orders
        self._gateway = gateway
        self._unit_of_work = unit_of_work

    def execute(self, data: CreatePaymentOrderInput) -> PaymentOrderEntity:
        if data.amount <= 0:
            raise InvalidPaymentAmountError()
        allowed = [method.lower() for method in getattr(settings, "PAYMENT_METHODS", ["mock"])]
        method = data.method.lower()
        if method not in allowed:
            raise PaymentMethodUnavailableError(f"Método '{method}' não está habilitado.")
        hours = int(getattr(settings, "PAYMENT_REUSE_HOURS", 2))
        with self._unit_of_work:
            existing = self._orders.find_reusable(data.user_id, data.amount, method, hours)
            if existing is not None:
                return existing
            order = self._orders.create(
                data.user_id,
                amount=data.amount,
                coins=data.amount,
                method=method,
                external_id="",
                checkout_url="",
            )
            session = self._gateway.create_checkout(order)
            return self._orders.update_checkout(
                order.id,
                external_id=session.external_id,
                checkout_url=session.checkout_url,
            )


@dataclass(frozen=True, slots=True)
class ListPaymentOrdersInput:
    user_id: UUID


class ListPaymentOrdersUseCase(UseCase[ListPaymentOrdersInput, list[PaymentOrderEntity]]):
    def __init__(self, orders: IPaymentOrderRepository) -> None:
        self._orders = orders

    def execute(self, data: ListPaymentOrdersInput) -> list[PaymentOrderEntity]:
        return self._orders.list_by_user(data.user_id)


@dataclass(frozen=True, slots=True)
class CancelPaymentOrderInput:
    user_id: UUID
    order_id: UUID


class CancelPaymentOrderUseCase(UseCase[CancelPaymentOrderInput, PaymentOrderEntity]):
    def __init__(self, orders: IPaymentOrderRepository, unit_of_work: UnitOfWork) -> None:
        self._orders = orders
        self._unit_of_work = unit_of_work

    def execute(self, data: CancelPaymentOrderInput) -> PaymentOrderEntity:
        with self._unit_of_work:
            order = self._orders.get_by_id(data.order_id)
            if order is None:
                raise PaymentOrderNotFoundError()
            if order.user_id != data.user_id:
                raise AuthorizationError()
            if order.status != "pending":
                raise PaymentNotPendingError()
            return self._orders.mark_cancelled(order.id)


@dataclass(frozen=True, slots=True)
class ConfirmPaymentInput:
    order_id: UUID
    user_id: UUID | None = None


class ConfirmPaymentUseCase(UseCase[ConfirmPaymentInput, PaymentOrderEntity]):
    def __init__(
        self,
        orders: IPaymentOrderRepository,
        wallets: IWalletRepository,
        bonus_policy: IPurchaseBonusPolicy,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._orders = orders
        self._wallets = wallets
        self._bonus_policy = bonus_policy
        self._unit_of_work = unit_of_work

    def execute(self, data: ConfirmPaymentInput) -> PaymentOrderEntity:
        with self._unit_of_work:
            order = self._orders.get_by_id(data.order_id)
            if order is None:
                raise PaymentOrderNotFoundError()
            if data.user_id is not None and order.user_id != data.user_id:
                raise AuthorizationError()
            if order.status == "confirmed":
                return order
            if order.status != "pending":
                raise PaymentAlreadyConfirmedError() if order.status == "confirmed" else PaymentNotPendingError()
            preview = self._bonus_policy.preview(order.amount)
            wallet = self._wallets.get_or_create(order.user_id)
            self._wallets.credit(
                wallet.id,
                order.amount,
                origin=order.method,
                description=f"Compra de moedas via {order.method}",
            )
            if preview.bonus > 0:
                self._wallets.credit_bonus(
                    wallet.id,
                    preview.bonus,
                    origin="bonus",
                    description=preview.description or "Bônus de compra",
                )
            return self._orders.mark_confirmed(
                order.id,
                bonus_applied=preview.bonus,
                total_credited=preview.total,
            )
