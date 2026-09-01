from apps.shop.application.use_cases import (
    AddToCartUseCase,
    CheckoutUseCase,
    GetCartUseCase,
    ListShopItemsUseCase,
    UpdateCartItemUseCase,
)
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ShopProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register_self(ListShopItemsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(AddToCartUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(GetCartUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(UpdateCartItemUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(CheckoutUseCase, lifetime=Lifetime.TRANSIENT)
