from apps.payment.application.use_cases import (
    CancelPaymentOrderUseCase,
    ConfirmPaymentUseCase,
    CreatePaymentOrderUseCase,
    ListPaymentOrdersUseCase,
    PreviewPaymentBonusUseCase,
)
from apps.payment.domain.gateways import IPaymentGateway
from apps.payment.domain.repositories import IPaymentOrderRepository
from apps.payment.infrastructure.mock_gateway import MockPaymentGateway
from apps.payment.infrastructure.repositories import DjangoPaymentOrderRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class PaymentProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(IPaymentOrderRepository, DjangoPaymentOrderRepository, lifetime=Lifetime.SCOPED)
        container.register(IPaymentGateway, MockPaymentGateway, lifetime=Lifetime.SINGLETON)
        for use_case in (
            PreviewPaymentBonusUseCase,
            CreatePaymentOrderUseCase,
            ListPaymentOrdersUseCase,
            CancelPaymentOrderUseCase,
            ConfirmPaymentUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
