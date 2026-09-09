from apps.payment.application.pricing import CoinPricingService
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
from apps.payment.application.webhooks import (
    HandleMercadoPagoWebhookUseCase,
    HandleStripeWebhookUseCase,
    WebhookSignatureService,
)
from apps.payment.domain.gateways import IPaymentGatewayRegistry
from apps.payment.domain.repositories import (
    IPaymentOrderRepository,
    IWebhookLogRepository,
)
from apps.payment.infrastructure.mercadopago_gateway import MercadoPagoGateway
from apps.payment.infrastructure.mock_gateway import MockPaymentGateway
from apps.payment.infrastructure.registry import PaymentGatewayRegistry
from apps.payment.infrastructure.repositories import (
    DjangoPaymentOrderRepository,
    DjangoWebhookLogRepository,
)
from apps.payment.infrastructure.stripe_gateway import StripeGateway
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class PaymentProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo payment.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(IPaymentOrderRepository, DjangoPaymentOrderRepository, lifetime=Lifetime.SCOPED)
        container.register(IWebhookLogRepository, DjangoWebhookLogRepository, lifetime=Lifetime.SCOPED)
        container.register_self(MockPaymentGateway, lifetime=Lifetime.SINGLETON)
        container.register_self(MercadoPagoGateway, lifetime=Lifetime.SINGLETON)
        container.register_self(StripeGateway, lifetime=Lifetime.SINGLETON)
        container.register(
            IPaymentGatewayRegistry, PaymentGatewayRegistry, lifetime=Lifetime.SINGLETON
        )
        container.register_self(WebhookSignatureService, lifetime=Lifetime.SINGLETON)
        container.register_self(CoinPricingService, lifetime=Lifetime.SCOPED)
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
            HandleMercadoPagoWebhookUseCase,
            HandleStripeWebhookUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
