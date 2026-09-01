from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.conf import settings

from apps.payment.application.pricing import CoinPricingService
from apps.payment.domain.entities import PaymentOrderEntity, ProcessResult
from apps.payment.domain.exceptions import (
    InvalidPaymentAmountError,
    PaymentAlreadyConfirmedError,
    PaymentMethodUnavailableError,
    PaymentNotPendingError,
    PaymentOrderNotFoundError,
)
from apps.payment.domain.repositories import IPaymentOrderRepository
from apps.payment.infrastructure.registry import PaymentGatewayRegistry
from apps.wallet.domain.bonus import IPurchaseBonusPolicy
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.models import CoinPackage
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError


def _configured_methods() -> list[str]:
    methods = [method.lower() for method in getattr(settings, "PAYMENT_METHODS", ["mercadopago", "stripe"])]
    if not getattr(settings, "PAYMENT_ALLOW_MOCK", False):
        methods = [method for method in methods if method != "mock"]
    return methods


class GetPaymentCatalogUseCase(UseCase[None, dict]):
    def __init__(self, gateways: PaymentGatewayRegistry, bonus_policy: IPurchaseBonusPolicy) -> None:
        self._gateways = gateways
        self._bonus_policy = bonus_policy

    def execute(self, data: None = None) -> dict:
        methods = self._gateways.available_methods(_configured_methods())
        packages = []
        for row in CoinPackage.objects.filter(active=True):
            preview = self._bonus_policy.preview(row.coins)
            packages.append(
                {
                    "id": str(row.id),
                    "code": row.code,
                    "name": row.name,
                    "coins": str(row.coins),
                    "price_brl": str(row.price_brl),
                    "price_usd": str(row.price_usd),
                    "badge": row.badge,
                    "bonus": str(preview.bonus),
                    "total_coins": str(preview.total),
                }
            )
        return {
            "currency": "BRL",
            "methods": methods,
            "packages": packages,
            "allow_custom_amount": True,
        }


@dataclass(frozen=True, slots=True)
class PreviewBonusInput:
    amount: Decimal
    currency: str = "BRL"
    package_id: str = ""


class PreviewPaymentBonusUseCase(UseCase[PreviewBonusInput, dict]):
    def __init__(self, bonus_policy: IPurchaseBonusPolicy) -> None:
        self._bonus_policy = bonus_policy
        self._pricing = CoinPricingService()

    def execute(self, data: PreviewBonusInput) -> dict:
        quote = self._pricing.quote(
            package_id=data.package_id or None,
            amount=data.amount if data.amount > 0 else None,
            currency=data.currency,
        )
        preview = self._bonus_policy.preview(quote.coins)
        return {
            "amount": str(quote.amount),
            "currency": quote.currency,
            "coins": str(quote.coins),
            "bonus": str(preview.bonus),
            "percent": str(preview.percent),
            "description": preview.description,
            "total": str(preview.total),
        }


@dataclass(frozen=True, slots=True)
class CreatePaymentOrderInput:
    user_id: UUID
    amount: Decimal | None = None
    method: str = ""
    currency: str = "BRL"
    package_id: str = ""


class CreatePaymentOrderUseCase(UseCase[CreatePaymentOrderInput, PaymentOrderEntity]):
    def __init__(
        self,
        orders: IPaymentOrderRepository,
        gateways: PaymentGatewayRegistry,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._orders = orders
        self._gateways = gateways
        self._unit_of_work = unit_of_work
        self._pricing = CoinPricingService()

    def _resolve_method(self, currency: str, requested: str) -> str:
        available = {item["id"] for item in self._gateways.available_methods(_configured_methods())}
        if requested:
            method = requested.lower()
            if method not in available:
                raise PaymentMethodUnavailableError(f"Método '{method}' não está habilitado.")
            return method
        if currency == "USD" and "stripe" in available:
            return "stripe"
        if currency == "BRL" and "mercadopago" in available:
            return "mercadopago"
        if "mock" in available:
            return "mock"
        raise PaymentMethodUnavailableError()

    def execute(self, data: CreatePaymentOrderInput) -> PaymentOrderEntity:
        quote = self._pricing.quote(
            package_id=data.package_id or None,
            amount=data.amount,
            currency=data.currency,
        )
        if quote.amount <= 0 or quote.coins <= 0:
            raise InvalidPaymentAmountError()
        method = self._resolve_method(quote.currency, data.method)
        if method == "mercadopago" and quote.currency != "BRL":
            raise ValidationDomainError("Mercado Pago aceita apenas BRL.")
        hours = int(getattr(settings, "PAYMENT_REUSE_HOURS", 2))
        with self._unit_of_work:
            existing = self._orders.find_reusable(
                data.user_id,
                quote.amount,
                method,
                hours,
                currency=quote.currency,
                package_code=quote.package_code,
            )
            if existing is not None:
                return existing
            order = self._orders.create(
                data.user_id,
                amount=quote.amount,
                coins=quote.coins,
                method=method,
                currency=quote.currency,
                package_code=quote.package_code,
                external_id="",
                checkout_url="",
            )
            session = self._gateways.get(method).create_checkout(order)
            return self._orders.update_checkout(
                order.id,
                external_id=session.external_id,
                checkout_url=session.checkout_url,
                client_secret=session.client_secret,
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
            if order.status not in {"pending", "processing"}:
                raise PaymentNotPendingError()
            return self._orders.mark_cancelled(order.id)


@dataclass(frozen=True, slots=True)
class SettlePaymentInput:
    order_id: UUID
    user_id: UUID | None = None
    allow_methods: tuple[str, ...] | None = None


class SettlePaymentUseCase(UseCase[SettlePaymentInput, PaymentOrderEntity]):
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

    def execute(self, data: SettlePaymentInput) -> PaymentOrderEntity:
        with self._unit_of_work:
            order = self._orders.get_by_id(data.order_id)
            if order is None:
                raise PaymentOrderNotFoundError()
            if data.user_id is not None and order.user_id != data.user_id:
                raise AuthorizationError()
            if order.status == "confirmed":
                return order
            if order.status not in {"pending", "processing"}:
                raise PaymentAlreadyConfirmedError() if order.status == "confirmed" else PaymentNotPendingError()
            if data.allow_methods is not None and order.method not in data.allow_methods:
                raise PaymentMethodUnavailableError("Este pedido não pode ser confirmado manualmente.")
            preview = self._bonus_policy.preview(order.coins)
            wallet = self._wallets.get_or_create(order.user_id)
            self._wallets.credit(
                wallet.id,
                order.coins,
                origin=order.method,
                description=f"Compra de {order.coins} moedas via {order.method} ({order.currency})",
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


@dataclass(frozen=True, slots=True)
class ConfirmPaymentInput:
    order_id: UUID
    user_id: UUID | None = None


class ConfirmPaymentUseCase(UseCase[ConfirmPaymentInput, PaymentOrderEntity]):
    def __init__(self, settle: SettlePaymentUseCase) -> None:
        self._settle = settle

    def execute(self, data: ConfirmPaymentInput) -> PaymentOrderEntity:
        allowed = ("mock",) if getattr(settings, "PAYMENT_ALLOW_MOCK", False) else ()
        return self._settle.execute(
            SettlePaymentInput(order_id=data.order_id, user_id=data.user_id, allow_methods=allowed)
        )


@dataclass(frozen=True, slots=True)
class ProcessPaymentInput:
    user_id: UUID
    order_id: UUID
    payload: dict
    payer_email: str = ""


class ProcessPaymentUseCase(UseCase[ProcessPaymentInput, dict]):
    def __init__(
        self,
        orders: IPaymentOrderRepository,
        gateways: PaymentGatewayRegistry,
        settle: SettlePaymentUseCase,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._orders = orders
        self._gateways = gateways
        self._settle = settle
        self._unit_of_work = unit_of_work

    def execute(self, data: ProcessPaymentInput) -> dict:
        order = self._orders.get_by_id(data.order_id)
        if order is None:
            raise PaymentOrderNotFoundError()
        if order.user_id != data.user_id:
            raise AuthorizationError()
        if order.status == "confirmed":
            return {"order": order, "result": ProcessResult(status="approved", external_id=order.external_id)}
        if order.status not in {"pending", "processing", "failed"}:
            raise PaymentNotPendingError()
        payload = dict(data.payload)
        payer = payload.get("payer") if isinstance(payload.get("payer"), dict) else {}
        if data.payer_email and not payer.get("email"):
            payer = {**payer, "email": data.payer_email}
            payload["payer"] = payer
        result = self._gateways.get(order.method).process_payment(order, payload)
        gateway_data = {
            "pix_qr_code": result.pix_qr_code,
            "pix_qr_code_base64": result.pix_qr_code_base64,
            "pix_ticket_url": result.pix_ticket_url,
            "boleto_url": result.boleto_url,
            "boleto_barcode": result.boleto_barcode,
            "message": result.message,
        }
        status = "processing" if result.status == "pending" else "failed" if result.status == "rejected" else "pending"
        with self._unit_of_work:
            order = self._orders.update_checkout(
                order.id,
                external_id=result.external_id or order.external_id,
                checkout_url=order.checkout_url,
                gateway_data=gateway_data,
                status=status if result.status != "approved" else order.status,
            )
        if result.status == "approved":
            order = self._settle.execute(SettlePaymentInput(order_id=order.id, user_id=data.user_id))
        elif result.status == "rejected":
            with self._unit_of_work:
                order = self._orders.mark_failed(order.id)
        return {"order": order, "result": result}


@dataclass(frozen=True, slots=True)
class GetPaymentStatusInput:
    user_id: UUID
    order_id: UUID


class GetPaymentStatusUseCase(UseCase[GetPaymentStatusInput, PaymentOrderEntity]):
    def __init__(
        self,
        orders: IPaymentOrderRepository,
        gateways: PaymentGatewayRegistry,
        settle: SettlePaymentUseCase,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._orders = orders
        self._gateways = gateways
        self._settle = settle
        self._unit_of_work = unit_of_work

    def execute(self, data: GetPaymentStatusInput) -> PaymentOrderEntity:
        order = self._orders.get_by_id(data.order_id)
        if order is None:
            raise PaymentOrderNotFoundError()
        if order.user_id != data.user_id:
            raise AuthorizationError()
        if order.status == "confirmed":
            return order
        result = self._gateways.get(order.method).fetch_status(order)
        if result is None:
            return order
        if result.status == "approved":
            return self._settle.execute(SettlePaymentInput(order_id=order.id, user_id=data.user_id))
        if result.status == "rejected":
            with self._unit_of_work:
                return self._orders.mark_failed(order.id)
        gateway_data = {**(order.gateway_data or {}), "message": result.message}
        with self._unit_of_work:
            return self._orders.update_checkout(
                order.id,
                external_id=result.external_id or order.external_id,
                checkout_url=order.checkout_url,
                gateway_data=gateway_data,
                status="processing",
            )


@dataclass(frozen=True, slots=True)
class ApplyGatewayPaymentInput:
    external_id: str = ""
    order_id: UUID | None = None
    approved: bool = False
    payload: dict | None = None


class ApplyGatewayPaymentUseCase(UseCase[ApplyGatewayPaymentInput, PaymentOrderEntity | None]):
    def __init__(self, orders: IPaymentOrderRepository, settle: SettlePaymentUseCase) -> None:
        self._orders = orders
        self._settle = settle

    def execute(self, data: ApplyGatewayPaymentInput) -> PaymentOrderEntity | None:
        order = None
        if data.order_id:
            order = self._orders.get_by_id(data.order_id)
        if order is None and data.external_id:
            order = self._orders.get_by_external_id(data.external_id)
        if order is None:
            return None
        if not data.approved:
            return order
        return self._settle.execute(SettlePaymentInput(order_id=order.id))
