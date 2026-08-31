from apps.wallet.application.use_cases import GetWalletUseCase, TransferToPlayerUseCase
from apps.wallet.domain.repositories import IWalletRepository
from apps.wallet.infrastructure.repositories import DjangoWalletRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class WalletProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(IWalletRepository, DjangoWalletRepository, lifetime=Lifetime.SCOPED)
        container.register_self(GetWalletUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(TransferToPlayerUseCase, lifetime=Lifetime.TRANSIENT)
