from apps.wallet.application.exchange import ExchangeCoinsUseCase, GetExchangeStateUseCase
from apps.wallet.application.use_cases import (
    GetWalletUseCase,
    PreviewPurchaseBonusUseCase,
    TransferToPlayerUseCase,
)
from apps.wallet.domain.bonus import IPurchaseBonusPolicy
from apps.wallet.domain.repositories import ICoinAdminRepository, IWalletRepository
from apps.wallet.infrastructure.bonus import DjangoPurchaseBonusPolicy
from apps.wallet.infrastructure.repositories import DjangoCoinAdminRepository, DjangoWalletRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class WalletProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo wallet.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(IWalletRepository, DjangoWalletRepository, lifetime=Lifetime.SCOPED)
        container.register(ICoinAdminRepository, DjangoCoinAdminRepository, lifetime=Lifetime.SCOPED)
        container.register(IPurchaseBonusPolicy, DjangoPurchaseBonusPolicy, lifetime=Lifetime.SCOPED)
        container.register_self(GetExchangeStateUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(ExchangeCoinsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(GetWalletUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(TransferToPlayerUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(PreviewPurchaseBonusUseCase, lifetime=Lifetime.TRANSIENT)
