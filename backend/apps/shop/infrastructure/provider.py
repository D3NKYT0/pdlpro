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
    """Registra portas, adaptadores e casos de uso do módulo shop.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register_self(ListShopItemsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(AddToCartUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(GetCartUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(UpdateCartItemUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(CheckoutUseCase, lifetime=Lifetime.TRANSIENT)
