from apps.shop.application.commerce_use_cases import (
    CreateStaffPackageUseCase,
    CreateStaffPromoUseCase,
    GetStaffPackageUseCase,
    GetStaffPromoUseCase,
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
from apps.shop.domain.repositories import (
    ICartRepository,
    IShopItemAdminRepository,
    IShopRepository,
    ISupporterCommissionPort,
)
from apps.shop.infrastructure.repositories import (
    DjangoCartRepository,
    DjangoShopItemAdminRepository,
    DjangoShopRepository,
    DjangoSupporterCommissionAdapter,
)
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
        container.register(IShopRepository, DjangoShopRepository, lifetime=Lifetime.SCOPED)
        container.register(ICartRepository, DjangoCartRepository, lifetime=Lifetime.SCOPED)
        container.register(
            ISupporterCommissionPort, DjangoSupporterCommissionAdapter, lifetime=Lifetime.SCOPED
        )
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
            GetStaffPackageUseCase,
            ListStaffPromosUseCase,
            GetStaffPromoUseCase,
            CreateStaffPackageUseCase,
            UpdateStaffPackageUseCase,
            CreateStaffPromoUseCase,
            UpdateStaffPromoUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
