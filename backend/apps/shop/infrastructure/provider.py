from apps.shop.application.commerce_use_cases import (
    CreateStaffPackageUseCase,
    CreateStaffPromoUseCase,
    ListActivePackagesUseCase,
    ListPurchasesUseCase,
    ListStaffPackagesUseCase,
    ListStaffPromosUseCase,
    QuoteCartUseCase,
    SetCartOptionsUseCase,
    SetCartPackageUseCase,
    UpdateStaffPackageUseCase,
    UpdateStaffPromoUseCase,
)
from apps.shop.application.use_cases import (
    AddToCartUseCase,
    CheckoutUseCase,
    GetCartUseCase,
    ListShopItemsUseCase,
    UpdateCartItemUseCase,
)
from apps.shop.domain.repositories import IShopItemAdminRepository
from apps.shop.infrastructure.repositories import DjangoShopItemAdminRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ShopProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo shop.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(IShopItemAdminRepository, DjangoShopItemAdminRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListShopItemsUseCase,
            AddToCartUseCase,
            GetCartUseCase,
            UpdateCartItemUseCase,
            CheckoutUseCase,
            ListActivePackagesUseCase,
            ListPurchasesUseCase,
            QuoteCartUseCase,
            SetCartPackageUseCase,
            SetCartOptionsUseCase,
            ListStaffPackagesUseCase,
            ListStaffPromosUseCase,
            CreateStaffPackageUseCase,
            UpdateStaffPackageUseCase,
            CreateStaffPromoUseCase,
            UpdateStaffPromoUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
