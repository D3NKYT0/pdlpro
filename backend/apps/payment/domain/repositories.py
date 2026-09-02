from __future__ import annotations

from abc import ABC, abstractmethod
from decimal import Decimal
from uuid import UUID

from apps.payment.domain.entities import PaymentOrderEntity


class IPaymentOrderRepository(ABC):
    """Porta de pedidos de pagamento, referências externas e estado de liquidação.

    Injete esta interface nos serviços de aplicação e registre o adaptador no provider. As
    assinaturas abaixo definem entradas e retornos; resultados opcionais usam None para
    ausência. Validação de negócio e autorização devem ocorrer no caso de uso que chama a porta.
    """

    @abstractmethod
    def get_by_id(self, order_id: UUID) -> PaymentOrderEntity | None:
        raise NotImplementedError

    @abstractmethod
    def get_by_external_id(self, external_id: str) -> PaymentOrderEntity | None:
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
