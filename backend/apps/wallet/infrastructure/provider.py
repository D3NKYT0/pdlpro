from apps.wallet.application.use_cases import GetWalletUseCase, PreviewPurchaseBonusUseCase, TransferToPlayerUseCase
from apps.wallet.application.exchange import ExchangeCoinsUseCase
from apps.wallet.domain.bonus import IPurchaseBonusPolicy
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.bonus import DjangoPurchaseBonusPolicy
from apps.wallet.infrastructure.repositories import DjangoWalletRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class WalletProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register_self(ExchangeCoinsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register(IWalletRepository, DjangoWalletRepository, lifetime=Lifetime.SCOPED)
        container.register(IPurchaseBonusPolicy, DjangoPurchaseBonusPolicy, lifetime=Lifetime.SCOPED)
        container.register_self(GetWalletUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(TransferToPlayerUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(PreviewPurchaseBonusUseCase, lifetime=Lifetime.TRANSIENT)
