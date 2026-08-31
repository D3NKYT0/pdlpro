from apps.payment.application.use_cases import (
    ApplyGatewayPaymentUseCase,
    CancelPaymentOrderUseCase,
    ConfirmPaymentUseCase,
    CreatePaymentOrderUseCase,
    GetPaymentCatalogUseCase,
    GetPaymentStatusUseCase,
    ListPaymentOrdersUseCase,
    PreviewPaymentBonusUseCase,
    ProcessPaymentUseCase,
    SettlePaymentUseCase,
)
from apps.payment.domain.repositories import IPaymentOrderRepository
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from apps.payment.infrastructure.mock_gateway import MockPaymentGateway
from apps.payment.infrastructure.registry import PaymentGatewayRegistry
from apps.payment.infrastructure.repositories import DjangoPaymentOrderRepository
from apps.payment.infrastructure.stripe_gateway import StripeGateway
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class PaymentProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(IPaymentOrderRepository, DjangoPaymentOrderRepository, lifetime=Lifetime.SCOPED)
        container.register_self(MockPaymentGateway, lifetime=Lifetime.SINGLETON)
        container.register_self(MercadoPagoGateway, lifetime=Lifetime.SINGLETON)
        container.register_self(StripeGateway, lifetime=Lifetime.SINGLETON)
        container.register_self(PaymentGatewayRegistry, lifetime=Lifetime.SINGLETON)
        for use_case in (
            GetPaymentCatalogUseCase,
            PreviewPaymentBonusUseCase,
            CreatePaymentOrderUseCase,
            ListPaymentOrdersUseCase,
            CancelPaymentOrderUseCase,
            SettlePaymentUseCase,
            ConfirmPaymentUseCase,
            ProcessPaymentUseCase,
            GetPaymentStatusUseCase,
            ApplyGatewayPaymentUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
