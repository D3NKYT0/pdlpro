from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any
from uuid import UUID

from apps.payment.domain.entities import PaymentAttemptEntity, PaymentOrderEntity


class IWebhookLogRepository(ABC):
    """Porta de auditoria das notificações recebidas dos gateways de pagamento.

    Injete esta interface nos casos de uso de webhook e registre o adaptador no provider.
    """

    @abstractmethod
    def create(self, *, kind: str, data_id: str, payload: dict | Any) -> None:
        """Persiste um recorte do evento (sem PII nem segredos do provedor)."""

        raise NotImplementedError


class IPaymentOrderRepository(ABC):
    """Porta de pedidos de pagamento, referências externas e estado de liquidação.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    ``order_rows`` devolve um iterável ordenado do mais recente ao mais antigo para paginação;
    o adaptador Django retorna um QuerySet de ``PedidoPagamento``.
    """

    @abstractmethod
    def get_by_id(self, order_id: UUID) -> PaymentOrderEntity | None:
        raise NotImplementedError

    @abstractmethod
    def get_for_update(self, order_id: UUID) -> PaymentOrderEntity | None:
        """Lê e bloqueia o pedido até o fim do UnitOfWork, antes de decidir uma transição."""
        raise NotImplementedError

    @abstractmethod
    def get_by_external_id(self, external_id: str) -> PaymentOrderEntity | None:
        raise NotImplementedError

    @abstractmethod
    def order_rows(self, user_id: UUID):
        """Iterável ordenado dos pedidos do usuário para paginação na apresentação.

        O adaptador Django retorna um QuerySet; combine com ``to_entity`` após fatiar a página.
        """

        raise NotImplementedError

    @abstractmethod
    def to_entity(self, row: Any) -> PaymentOrderEntity:
        """Converte uma linha de ``order_rows`` em ``PaymentOrderEntity``."""

        raise NotImplementedError

    @abstractmethod
    def list_by_user(self, user_id: UUID) -> list[PaymentOrderEntity]:
        raise NotImplementedError

    @abstractmethod
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
        raise NotImplementedError

    @abstractmethod
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
        raise NotImplementedError

    @abstractmethod
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
        raise NotImplementedError

    @abstractmethod
    def mark_cancelled(self, order_id: UUID) -> PaymentOrderEntity:
        raise NotImplementedError

    @abstractmethod
    def mark_failed(self, order_id: UUID) -> PaymentOrderEntity:
        raise NotImplementedError

    @abstractmethod
    def mark_confirmed(self, order_id: UUID, *, bonus_applied: Decimal, total_credited: Decimal) -> PaymentOrderEntity:
        raise NotImplementedError

    @abstractmethod
    def apply_reversal(
        self,
        order_id: UUID,
        *,
        refunded_amount: Decimal,
        coins_reversed: Decimal,
        bonus_reversed: Decimal,
        shortfall_increment: Decimal,
    ) -> PaymentOrderEntity:
        """Grava os totais acumulados de estorno; chamar com o pedido bloqueado."""

        raise NotImplementedError

    @abstractmethod
    def set_review_status(self, order_id: UUID, review_status: str) -> PaymentOrderEntity:
        """Define a revisão financeira (``""``, ``dispute`` ou ``manual_review``)."""

        raise NotImplementedError


class IPaymentAttemptRepository(ABC):
    """Porta das tentativas de cobrança de um pedido (LBN-05/LBN-06).

    Cada tentativa tem chave de idempotência própria, reutilizada em reenvios e timeouts. Chame
    os métodos que alteram estado com o pedido bloqueado por ``get_for_update``.
    """

    @abstractmethod
    def current(self, order_id: UUID) -> PaymentAttemptEntity | None:
        """Última tentativa do pedido, ou None quando ainda não houve cobrança."""

        raise NotImplementedError

    @abstractmethod
    def open(self, order_id: UUID) -> PaymentAttemptEntity:
        """Cria a próxima tentativa e devolve o pedido ``failed`` a ``processing``."""

        raise NotImplementedError

    @abstractmethod
    def record(self, attempt_id: UUID, *, status: str, external_id: str = "") -> PaymentAttemptEntity:
        """Atualiza estado e referência externa (mantém a referência anterior se vazia)."""

        raise NotImplementedError

    @abstractmethod
    def owns_external_id(self, order_id: UUID, external_id: str) -> bool:
        """Indica se a referência externa pertence ao pedido ou a uma de suas tentativas."""

        raise NotImplementedError

    @abstractmethod
    def record_alias(self, order_id: UUID, external_id: str, *, status: str) -> None:
        """Registra outra referência do provedor para o pedido (ex.: PaymentIntent da sessão)."""

        raise NotImplementedError


class IPaymentReversalRepository(ABC):
    """Porta do histórico idempotente de estornos, chargebacks e disputas (LBN-04)."""

    @abstractmethod
    def exists(self, event_key: str) -> bool:
        raise NotImplementedError

    @abstractmethod
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
        """Grava o evento conciliado; ``event_key`` é único e impede reaplicação."""

        raise NotImplementedError


class IPaymentReviewPort(ABC):
    """Consulta, para outros apps, quais usuários têm pedido em revisão financeira.

    Um pedido em ``dispute`` ou ``manual_review`` indica estorno, chargeback ou saldo devedor.
    """

    @abstractmethod
    def users_under_review(self, user_ids: list[UUID]) -> set[UUID]:
        raise NotImplementedError
