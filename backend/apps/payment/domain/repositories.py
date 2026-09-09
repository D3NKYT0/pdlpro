from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from typing import Any
from uuid import UUID

from apps.payment.domain.entities import PaymentOrderEntity


class IWebhookLogRepository(ABC):
    """Porta de auditoria das notificações recebidas dos gateways de pagamento.

    Injete esta interface nos casos de uso de webhook e registre o adaptador no provider.
    """

    @abstractmethod
    def create(self, *, kind: str, data_id: str, payload: dict | Any) -> None:
        """Persiste o payload bruto do evento para auditoria."""

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
