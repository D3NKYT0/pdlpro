from apps.marketplace.application.use_cases import (
    CancelListingUseCase,
    CreateListingUseCase,
    ListMyListingsUseCase,
    ListPublicListingsUseCase,
    PurchaseListingUseCase,
)
from apps.marketplace.domain.repositories import ICharacterListingRepository
from apps.marketplace.infrastructure.repositories import DjangoCharacterListingRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class MarketplaceProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo marketplace.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(ICharacterListingRepository, DjangoCharacterListingRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListPublicListingsUseCase,
            ListMyListingsUseCase,
            CreateListingUseCase,
            PurchaseListingUseCase,
            CancelListingUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
