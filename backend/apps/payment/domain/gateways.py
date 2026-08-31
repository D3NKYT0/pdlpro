from __future__ import annotations

from abc import ABC, abstractmethod

from apps.payment.domain.entities import CheckoutSession, PaymentOrderEntity


class IPaymentGateway(ABC):
    @abstractmethod
    def create_checkout(self, order: PaymentOrderEntity) -> CheckoutSession:
        raise NotImplementedError
