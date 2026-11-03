from __future__ import annotations

import inspect
import logging
import re
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from django.conf import settings

from apps.payment.application.pricing import CoinPricingService
from apps.payment.application.reversals import (
    ReconcilePaymentReversalInput,
    ReconcilePaymentReversalUseCase,
)
from apps.payment.domain.entities import (
    REVERSAL_STATUSES,
    PaymentOrderEntity,
    ProcessResult,
)
from apps.payment.domain.exceptions import (
    InvalidPaymentAmountError,
    PaymentAlreadyConfirmedError,
    PaymentGatewayError,
    PaymentMethodUnavailableError,
    PaymentNotPendingError,
    PaymentOrderNotFoundError,
)
from apps.payment.domain.gateways import (
    IPaymentGatewayRegistry,
    normalize_brl_method_priority,
)
from apps.payment.domain.repositories import (
    IPaymentAttemptRepository,
    IPaymentOrderRepository,
)
from apps.wallet.domain.bonus import IPurchaseBonusPolicy
from apps.wallet.domain.coins import floor_coins
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError
from common.hooks import HookNames, IHookBus

logger = logging.getLogger(__name__)


def custom_amount_policy() -> dict:
    """Política do valor personalizado da compra de moedas (limites em moedas; 0 = livre)."""

    return {
        "enabled": bool(getattr(settings, "WALLET_CUSTOM_AMOUNT_ENABLED", True)),
        "min_coins": max(int(getattr(settings, "WALLET_CUSTOM_AMOUNT_MIN_COINS", 0) or 0), 0),
        "max_coins": max(int(getattr(settings, "WALLET_CUSTOM_AMOUNT_MAX_COINS", 0) or 0), 0),
    }


def _configured_methods() -> list[str]:
    methods = [method.lower() for method in getattr(settings, "PAYMENT_METHODS", ["mercadopago", "stripe"])]
    if not getattr(settings, "PAYMENT_ALLOW_MOCK", False):
        methods = [method for method in methods if method != "mock"]
    return methods


class GetPaymentCatalogUseCase(UseCase[None, dict]):
    """Lista métodos disponíveis e pacotes ativos com preços e prévia de bônus.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``dict``.
    """

    def __init__(
        self,
        gateways: IPaymentGatewayRegistry,
        bonus_policy: IPurchaseBonusPolicy,
        wallets: IWalletRepository,
    ) -> None:
        self._gateways = gateways
        self._bonus_policy = bonus_policy
        self._wallets = wallets

    def execute(self, data: None = None) -> dict:
        enabled_currencies = self._wallets.list_enabled_charge_currencies()
        enabled_currency_codes = {c["code"] for c in enabled_currencies}

        raw_methods = self._gateways.available_methods(_configured_methods())
        methods = []
        accepted_by_gateways: set[str] = set()

        for method in raw_methods:
            method_currencies = [c for c in method.get("currencies", []) if c in enabled_currency_codes]
            if method_currencies:
                accepted_by_gateways.update(method_currencies)
                methods.append({**method, "currencies": method_currencies})

        catalog_currencies = [
            {"code": c["code"], "settlement": bool(c["settlement"])}
            for c in enabled_currencies
            if c["code"] in accepted_by_gateways
        ]
        settlement_code = next((c["code"] for c in catalog_currencies if c["settlement"]), "BRL")

        packages = []
        for row in self._wallets.list_active_coin_packages():
            preview = self._bonus_policy.preview(row["coins"])
            prices_dict = {
                curr: str(amt)
                for curr, amt in (row.get("prices") or {}).items()
                if curr in accepted_by_gateways
            }
            if "BRL" not in prices_dict and row.get("price_brl") and "BRL" in accepted_by_gateways:
                prices_dict["BRL"] = str(row["price_brl"])
            if "USD" not in prices_dict and row.get("price_usd") and "USD" in accepted_by_gateways:
                prices_dict["USD"] = str(row["price_usd"])

            packages.append(
                {
                    "id": row["id"],
                    "code": row["code"],
                    "name": row["name"],
                    "coins": str(row["coins"]),
                    "price_brl": str(row["price_brl"]),
                    "price_usd": str(row["price_usd"]),
                    "prices": prices_dict,
                    "badge": row["badge"],
                    "bonus": str(preview.bonus),
                    "total_coins": str(preview.total),
                }
            )
        return {
            "currency": settlement_code,
            "currencies": catalog_currencies,
            "methods": methods,
            "packages": packages,
            "allow_custom_amount": custom_amount_policy()["enabled"],
            "custom_amount": custom_amount_policy(),
            "promo": self._wallets.get_current_purchase_promo(),
            "brl_method_priority": normalize_brl_method_priority(
                getattr(settings, "PAYMENT_BRL_METHOD_PRIORITY", "user_choice")
            ),
        }


@dataclass(frozen=True, slots=True)
class PreviewBonusInput:
    """Dados de entrada de ``PreviewPaymentBonusUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Use Decimal para valores monetários,
    evitando conversão intermediária por float.
    """

    amount: Decimal
    currency: str = "BRL"
    package_id: str = ""


class PreviewPaymentBonusUseCase(UseCase[PreviewBonusInput, dict]):
    """Converte valor ou pacote em moedas e calcula o bônus sem criar pedido.

    Uso: resolva pelo container e chame ``execute(data)`` com ``PreviewBonusInput``. O retorno é
    ``dict``.
    """

    def __init__(self, bonus_policy: IPurchaseBonusPolicy, pricing: CoinPricingService) -> None:
        self._bonus_policy = bonus_policy
        self._pricing = pricing

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
    """Dados de entrada de ``CreatePaymentOrderUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada. Use Decimal para valores monetários, evitando conversão intermediária
    por float.
    """

    user_id: UUID
    amount: Decimal | None = None
    method: str = ""
    currency: str = "BRL"
    package_id: str = ""
    source_order_id: UUID | None = None


class CreatePaymentOrderUseCase(UseCase[CreatePaymentOrderInput, PaymentOrderEntity]):
    """Cota a compra, escolhe o método e reutiliza um pedido compatível dentro da janela
    configurada; se necessário, cria pedido e checkout externo. A chamada ao provedor não é
    revertida pelo UnitOfWork do Django.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreatePaymentOrderInput``. O
    retorno é ``PaymentOrderEntity``.
    """

    def __init__(
        self,
        orders: IPaymentOrderRepository,
        gateways: IPaymentGatewayRegistry,
        unit_of_work: UnitOfWork,
        pricing: CoinPricingService,
    ) -> None:
        self._orders = orders
        self._gateways = gateways
        self._unit_of_work = unit_of_work
        self._pricing = pricing

    def _resolve_method(self, currency: str, requested: str, *, stripe_retry: bool = False) -> str:
        methods_by_id = {item["id"]: item for item in self._gateways.available_methods(_configured_methods())}
        if requested:
            method = requested.lower()
            entry = methods_by_id.get(method)
            if entry is None:
                raise PaymentMethodUnavailableError(f"Método '{method}' não está habilitado.")
            currencies = entry.get("currencies", [])
            if method == "stripe" and stripe_retry:
                currencies = entry.get("retry_currencies", currencies)
            if currencies and currency not in currencies:
                raise ValidationDomainError(f"Método '{method}' não aceita {currency}.")
            return method
        priority = normalize_brl_method_priority(getattr(settings, "PAYMENT_BRL_METHOD_PRIORITY", "user_choice"))
        if currency == "BRL":
            if priority == "mercadopago" and "mercadopago" in methods_by_id:
                return "mercadopago"
            if priority == "stripe" and "stripe" in methods_by_id:
                # Stripe fixo para BRL: Mercado Pago fica indisponível para BRL
                return "stripe"
            # user_choice ou fallback automático
            if "mercadopago" in methods_by_id:
                return "mercadopago"
            if "stripe" in methods_by_id:
                return "stripe"
        else:
            if "stripe" in methods_by_id and currency in methods_by_id["stripe"].get("currencies", []):
                return "stripe"
            for m_id, entry in methods_by_id.items():
                if currency in entry.get("currencies", []):
                    return m_id
        if "mock" in methods_by_id:
            return "mock"
        raise PaymentMethodUnavailableError()

    def _quote_input(self, data: CreatePaymentOrderInput) -> tuple[str | None, Decimal | None, bool]:
        """Recota a compra original e autoriza nova moeda na Stripe só para sua origem Stripe.

        Exige pedido pendente/processando do próprio usuário. A autorização não habilita
        moedas ausentes da configuração do gateway nem altera o método das compras novas.
        """

        if data.source_order_id is None:
            return data.package_id or None, data.amount, False
        source = self._orders.get_by_id(data.source_order_id)
        if source is None or source.user_id != data.user_id:
            raise PaymentOrderNotFoundError()
        if source.status not in {"pending", "processing"}:
            raise PaymentNotPendingError()
        stripe_retry = source.method == "stripe" and source.currency != data.currency.strip().upper()
        if source.package_code:
            return source.package_code, None, stripe_retry
        return None, self._pricing.amount_for_coins(source.coins, data.currency), stripe_retry

    def execute(self, data: CreatePaymentOrderInput) -> PaymentOrderEntity:
        package_id, amount, stripe_retry = self._quote_input(data)
        quote = self._pricing.quote(
            package_id=package_id,
            amount=amount,
            currency=data.currency,
        )
        if quote.amount <= 0 or quote.coins <= 0:
            raise InvalidPaymentAmountError()
        if not package_id and data.source_order_id is None:
            # Esconder o campo na tela não basta: a API aplica a mesma política.
            policy = custom_amount_policy()
            if not policy["enabled"]:
                raise PaymentMethodUnavailableError("Compras com valor personalizado estão desativadas.")
            if (policy["min_coins"] and quote.coins < policy["min_coins"]) or (
                policy["max_coins"] and quote.coins > policy["max_coins"]
            ):
                raise InvalidPaymentAmountError("O valor está fora do limite permitido para compras personalizadas.")
        method = self._resolve_method(quote.currency, data.method, stripe_retry=stripe_retry)
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
    """Dados de entrada de ``ListPaymentOrdersUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class ListPaymentOrdersUseCase(UseCase[ListPaymentOrdersInput, list[PaymentOrderEntity]]):
    """Lista os pedidos de pagamento pertencentes ao UUID de usuário informado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListPaymentOrdersInput``. O
    retorno é ``list[PaymentOrderEntity]``.
    """

    def __init__(self, orders: IPaymentOrderRepository) -> None:
        self._orders = orders

    def execute(self, data: ListPaymentOrdersInput) -> list[PaymentOrderEntity]:
        return self._orders.list_by_user(data.user_id)


@dataclass(frozen=True, slots=True)
class CancelPaymentOrderInput:
    """Dados de entrada de ``CancelPaymentOrderUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    order_id: UUID


class CancelPaymentOrderUseCase(UseCase[CancelPaymentOrderInput, PaymentOrderEntity]):
    """Cancela localmente um pedido pending ou processing após verificar o proprietário. Não
    solicita cancelamento ao provedor externo.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CancelPaymentOrderInput``. O
    retorno é ``PaymentOrderEntity``.
    """

    def __init__(self, orders: IPaymentOrderRepository, unit_of_work: UnitOfWork) -> None:
        self._orders = orders
        self._unit_of_work = unit_of_work

    def execute(self, data: CancelPaymentOrderInput) -> PaymentOrderEntity:
        with self._unit_of_work:
            order = self._orders.get_for_update(data.order_id)
            if order is None:
                raise PaymentOrderNotFoundError()
            if order.user_id != data.user_id:
                raise AuthorizationError()
            if order.status not in {"pending", "processing"}:
                raise PaymentNotPendingError()
            return self._orders.mark_cancelled(order.id)


@dataclass(frozen=True, slots=True)
class SettlePaymentInput:
    """Dados de entrada de ``SettlePaymentUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    order_id: UUID
    user_id: UUID | None = None
    allow_methods: tuple[str, ...] | None = None
    # Referência confirmada pelo provedor. Só ela permite liquidar um pedido ``failed``: uma
    # tentativa anterior aprovada tardiamente precisa ser creditada, nunca descartada.
    external_id: str = ""


class SettlePaymentUseCase(UseCase[SettlePaymentInput, PaymentOrderEntity]):
    """Credita moedas e bônus e marca o pedido como confirmado no mesmo UnitOfWork. Um pedido já
    confirmado é devolvido sem novo crédito nesta execução. Use somente após confirmação
    confiável do provedor ou no fluxo mock; user_id opcional restringe o proprietário e
    allow_methods restringe os métodos aceitos.

    Uso: resolva pelo container e chame ``execute(data)`` com ``SettlePaymentInput``. O retorno
    é ``PaymentOrderEntity``.
    """

    def __init__(
        self,
        orders: IPaymentOrderRepository,
        wallets: IWalletRepository,
        bonus_policy: IPurchaseBonusPolicy,
        unit_of_work: UnitOfWork,
        hooks: IHookBus,
        attempts: IPaymentAttemptRepository,
    ) -> None:
        self._orders = orders
        self._wallets = wallets
        self._bonus_policy = bonus_policy
        self._unit_of_work = unit_of_work
        self._hooks = hooks
        self._attempts = attempts

    def execute(self, data: SettlePaymentInput) -> PaymentOrderEntity:
        already_confirmed = False
        with self._unit_of_work:
            order = self._orders.get_for_update(data.order_id)
            if order is None:
                raise PaymentOrderNotFoundError()
            if data.user_id is not None and order.user_id != data.user_id:
                raise AuthorizationError()
            if order.status == "confirmed":
                already_confirmed = True
                settled = order
            else:
                late_approval = (
                    order.status == "failed"
                    and bool(data.external_id)
                    and self._attempts.owns_external_id(order.id, data.external_id)
                )
                if order.status not in {"pending", "processing"} and not late_approval:
                    raise PaymentAlreadyConfirmedError() if order.status == "confirmed" else PaymentNotPendingError()
                if data.allow_methods is not None and order.method not in data.allow_methods:
                    raise PaymentMethodUnavailableError("Este pedido não pode ser confirmado manualmente.")
                coins = floor_coins(order.coins)
                preview = self._bonus_policy.preview(coins)
                wallet = self._wallets.get_or_create(order.user_id)
                self._wallets.credit(
                    wallet.id,
                    coins,
                    origin=order.method,
                    description=f"Compra de {int(coins)} moedas via {order.method} ({order.currency})",
                )
                if preview.bonus > 0:
                    self._wallets.credit_bonus(
                        wallet.id,
                        preview.bonus,
                        origin="bonus",
                        description=preview.description or "Bônus de compra",
                    )
                settled = self._orders.mark_confirmed(
                    order.id,
                    bonus_applied=preview.bonus,
                    total_credited=preview.total,
                )
        if not already_confirmed:
            self._hooks.publish(
                HookNames.PAYMENT_SETTLED,
                {
                    "order_id": str(settled.id),
                    "user_id": str(settled.user_id),
                    "method": settled.method,
                    "coins": str(settled.coins),
                },
            )
        return settled


@dataclass(frozen=True, slots=True)
class ConfirmPaymentInput:
    """Dados de entrada de ``ConfirmPaymentUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    order_id: UUID
    user_id: UUID | None = None


class ConfirmPaymentUseCase(UseCase[ConfirmPaymentInput, PaymentOrderEntity]):
    """Bloqueia a confirmação manual pelo jogador. Simulações só são liquidadas pela equipe
    em ``StaffConfirmMockPaymentUseCase``.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ConfirmPaymentInput``. O retorno
    é ``PaymentOrderEntity``.
    """

    def execute(self, data: ConfirmPaymentInput) -> PaymentOrderEntity:
        raise AuthorizationError("A confirmação de simulação só pode ser feita pela equipe.")


@dataclass(frozen=True, slots=True)
class StaffConfirmMockPaymentInput:
    """Dados de entrada de ``StaffConfirmMockPaymentUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta o pedido; a autorização de
    equipe fica na view. Não liquida métodos reais.
    """

    order_id: UUID


class StaffConfirmMockPaymentUseCase(UseCase[StaffConfirmMockPaymentInput, PaymentOrderEntity]):
    """Liquida um pedido mock em nome da equipe, sem checar o jogador dono. Recusa Stripe,
    Mercado Pago e qualquer método que não seja simulação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``StaffConfirmMockPaymentInput``.
    O retorno é ``PaymentOrderEntity``.
    """

    def __init__(self, settle: SettlePaymentUseCase) -> None:
        self._settle = settle

    def execute(self, data: StaffConfirmMockPaymentInput) -> PaymentOrderEntity:
        return self._settle.execute(
            SettlePaymentInput(order_id=data.order_id, user_id=None, allow_methods=("mock",))
        )


@dataclass(frozen=True, slots=True)
class ProcessPaymentInput:
    """Dados de entrada de ``ProcessPaymentUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    order_id: UUID
    payload: dict
    payer_email: str = ""
    payer_first_name: str = ""
    payer_last_name: str = ""
    payer_document: str = ""


class ProcessPaymentUseCase(UseCase[ProcessPaymentInput, dict]):
    """Envia os dados de pagamento ao gateway do pedido, salva os dados de checkout e liquida o
    saldo se o resultado for aprovado. Verifica o proprietário antes da chamada externa.

    Cada cobrança pertence a uma tentativa com chave de idempotência persistida: reenvios e
    timeouts reutilizam a mesma chave; uma tentativa com cobrança ainda pendente é conciliada no
    provedor antes de qualquer nova cobrança; só uma rejeição definitiva abre a tentativa
    seguinte (``failed`` → ``processing``). As referências antigas continuam associadas ao
    pedido, então uma aprovação tardia ainda é creditada uma única vez.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ProcessPaymentInput``. O retorno
    é ``dict``.
    """

    def __init__(
        self,
        orders: IPaymentOrderRepository,
        gateways: IPaymentGatewayRegistry,
        settle: SettlePaymentUseCase,
        unit_of_work: UnitOfWork,
        attempts: IPaymentAttemptRepository,
    ) -> None:
        self._orders = orders
        self._gateways = gateways
        self._settle = settle
        self._unit_of_work = unit_of_work
        self._attempts = attempts

    def execute(self, data: ProcessPaymentInput) -> dict:
        order = self._orders.get_by_id(data.order_id)
        if order is None:
            raise PaymentOrderNotFoundError()
        if order.user_id != data.user_id:
            raise AuthorizationError()
        if order.method == "mock":
            raise PaymentMethodUnavailableError(
                "Simulações não são processadas pelo jogador. A equipe confirma o pedido."
            )
        if order.status == "confirmed":
            return {"order": order, "result": ProcessResult(status="approved", external_id=order.external_id)}
        if order.checkout_url and order.method in {"mercadopago", "stripe"}:
            raise PaymentMethodUnavailableError("Este pedido deve ser pago no site do provedor.")
        if order.status not in {"pending", "processing", "failed"}:
            raise PaymentNotPendingError()
        payload = self._payload(data)
        gateway = self._gateways.get(order.method)
        attempt, reconcile = self._claim_attempt(order.id)
        if attempt is None:
            order = self._orders.get_by_id(order.id)
            return {"order": order, "result": ProcessResult(status="approved", external_id=order.external_id)}
        if reconcile:
            previous = gateway.fetch_by_external_id(attempt.external_id)
            if previous is not None and previous.status == "approved" and previous.refunded_amount <= 0:
                settled = self._settle.execute(
                    SettlePaymentInput(order_id=order.id, user_id=data.user_id, external_id=attempt.external_id)
                )
                return {"order": settled, "result": previous}
            if previous is None or previous.status not in {"rejected", *REVERSAL_STATUSES}:
                # A cobrança anterior ainda pode ser paga: não crie uma segunda.
                current = self._orders.get_by_id(order.id)
                return {"order": current, "result": previous or ProcessResult(status="pending", external_id=attempt.external_id)}
            with self._unit_of_work:
                self._attempts.record(attempt.id, status="rejected")
                attempt = self._attempts.open(order.id)
        try:
            result = _process_with_key(gateway, order, payload, str(attempt.idempotency_key))
        except PaymentGatewayError:
            # Recusa do provedor antes de existir cobrança: a próxima chamada é outra tentativa.
            with self._unit_of_work:
                self._attempts.record(attempt.id, status="rejected")
            raise
        gateway_data = {
            "pix_qr_code": result.pix_qr_code,
            "pix_qr_code_base64": result.pix_qr_code_base64,
            "pix_ticket_url": result.pix_ticket_url,
            "boleto_url": result.boleto_url,
            "boleto_barcode": result.boleto_barcode,
            "message": result.message,
        }
        approved = result.status == "approved" and result.refunded_amount <= 0
        rejected = result.status == "rejected" or result.status in REVERSAL_STATUSES
        attempt_status = "approved" if approved else "rejected" if rejected else "pending"
        with self._unit_of_work:
            self._attempts.record(attempt.id, status=attempt_status, external_id=result.external_id)
            order = self._orders.update_checkout(
                order.id,
                external_id=result.external_id or order.external_id,
                checkout_url=order.checkout_url,
                gateway_data=gateway_data,
                status="processing" if not approved else None,
            )
        if approved:
            order = self._settle.execute(
                SettlePaymentInput(order_id=order.id, user_id=data.user_id, external_id=result.external_id)
            )
        elif rejected:
            with self._unit_of_work:
                order = self._orders.mark_failed(order.id)
        return {"order": order, "result": result}

    def _claim_attempt(self, order_id: UUID):
        """Escolhe, com o pedido bloqueado, a tentativa a usar; ``(None, False)`` se já pago."""

        with self._unit_of_work:
            locked = self._orders.get_for_update(order_id)
            if locked is None:
                raise PaymentOrderNotFoundError()
            if locked.status == "confirmed":
                return None, False
            if locked.status not in {"pending", "processing", "failed"}:
                raise PaymentNotPendingError()
            attempt = self._attempts.current(order_id)
            if attempt is None and locked.status == "processing" and locked.external_id:
                # Pedido anterior às tentativas com cobrança ainda aberta: concilie-a primeiro.
                attempt = self._attempts.open(order_id)
                return self._attempts.record(attempt.id, status="pending", external_id=locked.external_id), True
            if attempt is None or attempt.status != "pending":
                return self._attempts.open(order_id), False
            # Pendente com referência: conciliar antes. Sem referência (timeout antes da
            # resposta): repetir a mesma tentativa, com a mesma chave de idempotência.
            return attempt, bool(attempt.external_id)

    @staticmethod
    def _payload(data: ProcessPaymentInput) -> dict:
        payload = dict(data.payload)
        payer = dict(payload.get("payer")) if isinstance(payload.get("payer"), dict) else {}
        if data.payer_email and not payer.get("email"):
            payer["email"] = data.payer_email
        if data.payer_first_name and not payer.get("first_name"):
            payer["first_name"] = data.payer_first_name
        if data.payer_last_name and not payer.get("last_name"):
            payer["last_name"] = data.payer_last_name
        if data.payer_document and not payer.get("identification"):
            digits = re.sub(r"\D", "", data.payer_document)
            if digits:
                doc_type = "CNPJ" if len(digits) > 11 else "CPF"
                payer["identification"] = {"type": doc_type, "number": digits}
        payload["payer"] = payer
        return payload


@dataclass(frozen=True, slots=True)
class GetPaymentStatusInput:
    """Dados de entrada de ``GetPaymentStatusUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    order_id: UUID


class GetPaymentStatusUseCase(UseCase[GetPaymentStatusInput, PaymentOrderEntity]):
    """Consulta o gateway e sincroniza o pedido: uma aprovação pode creditar a carteira e um
    estorno/chargeback de pedido confirmado é conciliado. Apesar do nome de consulta, pode
    alterar pedido e saldo.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetPaymentStatusInput``. O
    retorno é ``PaymentOrderEntity``.
    """

    def __init__(
        self,
        orders: IPaymentOrderRepository,
        gateways: IPaymentGatewayRegistry,
        settle: SettlePaymentUseCase,
        unit_of_work: UnitOfWork,
        reversals: ReconcilePaymentReversalUseCase,
    ) -> None:
        self._orders = orders
        self._gateways = gateways
        self._settle = settle
        self._unit_of_work = unit_of_work
        self._reversals = reversals

    def execute(self, data: GetPaymentStatusInput) -> PaymentOrderEntity:
        order = self._orders.get_by_id(data.order_id)
        if order is None:
            raise PaymentOrderNotFoundError()
        if order.user_id != data.user_id:
            raise AuthorizationError()
        if order.status == "confirmed":
            return self._reconcile_confirmed(order)
        result = self._gateways.get(order.method).fetch_status(order)
        if result is None:
            return order
        if result.status == "approved" and result.refunded_amount <= 0:
            return self._settle.execute(
                SettlePaymentInput(order_id=order.id, user_id=data.user_id, external_id=result.external_id)
            )
        if result.status in {"rejected", "approved", *REVERSAL_STATUSES}:
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

    def _reconcile_confirmed(self, order: PaymentOrderEntity) -> PaymentOrderEntity:
        if order.method == "mock" or not order.external_id:
            return order
        try:
            result = self._gateways.get(order.method).fetch_status(order)
        except Exception:
            logger.warning("Não foi possível reconsultar o pedido confirmado %s", order.id, exc_info=True)
            return order
        reversal = reversal_from_result(order.method, result)
        if reversal is None:
            return order
        kind, refunded_total, key = reversal
        reconciled = self._reversals.execute(
            ReconcilePaymentReversalInput(order_id=order.id, event_key=key, kind=kind, refunded_total=refunded_total)
        )
        return reconciled or order


def _process_with_key(gateway, order: PaymentOrderEntity, payload: dict, key: str) -> ProcessResult:
    """Repassa a chave da tentativa; gateways de extensões antigos sem o parâmetro seguem aceitos."""

    if "idempotency_key" in inspect.signature(gateway.process_payment).parameters:
        return gateway.process_payment(order, payload, idempotency_key=key)
    return gateway.process_payment(order, payload)


def reversal_from_result(method: str, result: ProcessResult | None) -> tuple[str, Decimal, str] | None:
    """Converte um status consultado no provedor em ``(kind, total devolvido, event_key)``."""

    if result is None:
        return None
    if result.status == "charged_back":
        kind = "chargeback"
    elif result.status == "disputed":
        kind = "dispute_opened"
    elif result.status == "refunded" or result.refunded_amount > 0:
        kind = "refund"
    else:
        return None
    total = result.refunded_amount
    return kind, total, f"{method}:{result.external_id}:{kind}:{total}"


@dataclass(frozen=True, slots=True)
class ApplyGatewayPaymentInput:
    """Dados de entrada de ``ApplyGatewayPaymentUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    external_id: str = ""
    order_id: UUID | None = None
    approved: bool = False
    payload: dict | None = None
    # Outras referências do mesmo pagamento (ex.: PaymentIntent de uma Checkout Session),
    # registradas para que estornos e disputas posteriores encontrem o pedido.
    aliases: tuple[str, ...] = ()


class ApplyGatewayPaymentUseCase(UseCase[ApplyGatewayPaymentInput, PaymentOrderEntity | None]):
    """Localiza o pedido por UUID ou identificador externo e liquida somente eventos aprovados.
    Retorna None se não localizar; a validação da assinatura e da origem do evento deve ocorrer
    antes desta chamada.

    Quando o evento chega com ``order_id`` (metadado que o gateway apenas repassa) e o pedido já
    tem ``external_id`` de outra cobrança, a liquidação é recusada: aceitar o metadado nesse caso
    permitiria apontar um pagamento barato para um pedido caro.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ApplyGatewayPaymentInput``. O
    retorno é ``PaymentOrderEntity | None``.
    """

    def __init__(
        self,
        orders: IPaymentOrderRepository,
        settle: SettlePaymentUseCase,
        attempts: IPaymentAttemptRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._orders = orders
        self._settle = settle
        self._attempts = attempts
        self._unit_of_work = unit_of_work

    def execute(self, data: ApplyGatewayPaymentInput) -> PaymentOrderEntity | None:
        order = None
        if data.order_id:
            order = self._orders.get_by_id(data.order_id)
            if order is not None and not self._external_id_matches(order, data.external_id):
                logger.warning(
                    "Webhook recusado: order_id=%s aponta para external_id=%s, evento trouxe %s",
                    order.id,
                    order.external_id,
                    data.external_id,
                )
                return None
        if order is None and data.external_id:
            order = self._orders.get_by_external_id(data.external_id)
        if order is None:
            return None
        if not data.approved:
            return order
        settled = self._settle.execute(SettlePaymentInput(order_id=order.id, external_id=data.external_id))
        aliases = [alias for alias in (data.external_id, *data.aliases) if alias]
        if aliases and settled.status == "confirmed":
            with self._unit_of_work:
                for alias in aliases:
                    self._attempts.record_alias(order.id, alias, status="approved")
        return settled

    def _external_id_matches(self, order: PaymentOrderEntity, external_id: str) -> bool:
        # Pedido sem external_id continua aceito: o webhook pode chegar antes de o checkout
        # persistir o identificador do gateway. Referências de tentativas anteriores do mesmo
        # pedido também são aceitas (aprovação tardia).
        if not external_id or not order.external_id:
            return True
        return str(order.external_id) == str(external_id) or self._attempts.owns_external_id(order.id, external_id)
