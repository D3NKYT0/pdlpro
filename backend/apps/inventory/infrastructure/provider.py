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
