from __future__ import annotations

from abc import ABC, abstractmethod

from apps.payment.domain.entities import CheckoutSession, PaymentOrderEntity, ProcessResult


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
