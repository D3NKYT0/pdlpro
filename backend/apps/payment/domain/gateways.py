from __future__ import annotations

from abc import ABC, abstractmethod

from apps.payment.domain.entities import (
    CheckoutSession,
    PaymentOrderEntity,
    ProcessResult,
)


class IPaymentGateway(ABC):
    """Porta comum dos provedores de pagamento usados pelo painel.

    Implemente disponibilidade, metadados públicos, checkout, processamento e consulta de status
    conforme os métodos abaixo. Retorne os DTOs do domínio; o adaptador comunica o resultado e a
    aplicação decide quando creditar moedas. Registre novos provedores no PaymentGatewayRegistry
    e no provider.
    """

    method_name: str = ""

    def is_available(self) -> bool:
        return True

    def public_key(self) -> str:
        return ""

    @abstractmethod
    def create_checkout(self, order: PaymentOrderEntity) -> CheckoutSession:
        raise NotImplementedError

    def process_payment(self, order: PaymentOrderEntity, payload: dict) -> ProcessResult:
        raise NotImplementedError

    def fetch_status(self, order: PaymentOrderEntity) -> ProcessResult | None:
        return None

    def fetch_by_external_id(self, external_id: str) -> ProcessResult | None:
        """Consulta um pagamento pelo id externo do provedor (ex.: webhook)."""

        return None


class IPaymentGatewayRegistry(ABC):
    """Porta de seleção de gateways de pagamento por nome do método."""

    @abstractmethod
    def get(self, method: str) -> IPaymentGateway:
        """Retorna o gateway disponível ou lança PaymentMethodUnavailableError."""

        raise NotImplementedError

    @abstractmethod
    def available_methods(self, configured: list[str]) -> list[dict]:
        """Filtra métodos configurados e retorna metadados públicos."""

        raise NotImplementedError
