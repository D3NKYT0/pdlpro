from apps.auction.application.use_cases import (
    CloseExpiredAuctionsUseCase,
    CreateAuctionUseCase,
    ListMyAuctionsUseCase,
    ListOpenAuctionsUseCase,
    PlaceBidUseCase,
)
from apps.auction.domain.repositories import IAuctionRepository
from apps.auction.infrastructure.repositories import DjangoAuctionRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class AuctionProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo auction.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(IAuctionRepository, DjangoAuctionRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListOpenAuctionsUseCase,
            ListMyAuctionsUseCase,
            CreateAuctionUseCase,
            PlaceBidUseCase,
            CloseExpiredAuctionsUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
