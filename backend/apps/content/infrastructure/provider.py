from apps.content.application.use_cases import GetNewsUseCase, ListDownloadsUseCase, ListFaqUseCase, ListNewsUseCase
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ContentProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register_self(ListNewsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(GetNewsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(ListFaqUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(ListDownloadsUseCase, lifetime=Lifetime.TRANSIENT)
