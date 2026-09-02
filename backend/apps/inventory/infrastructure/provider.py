from apps.inventory.application.use_cases import (
    DepositItemUseCase,
    ListCharacterEquipmentUseCase,
    ListGameItemsUseCase,
    SyncInventoriesUseCase,
    TradeItemUseCase,
    WithdrawItemUseCase,
)
from apps.inventory.domain.repositories import IInventoryRepository
from apps.inventory.infrastructure.repositories import DjangoInventoryRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class InventoryProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo inventory.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(IInventoryRepository, DjangoInventoryRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            SyncInventoriesUseCase,
            WithdrawItemUseCase,
            DepositItemUseCase,
            TradeItemUseCase,
            ListGameItemsUseCase,
            ListCharacterEquipmentUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
