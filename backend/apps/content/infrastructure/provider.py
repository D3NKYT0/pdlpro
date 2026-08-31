from apps.content.application.use_cases import (
    GetNewsUseCase,
    GetWikiPageUseCase,
    ListCalendarEventsUseCase,
    ListDownloadsUseCase,
    ListFaqUseCase,
    ListNewsUseCase,
    ListWikiPagesUseCase,
    SearchWikiUseCase,
)
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ContentProvider(AppProvider):
    def register(self, container: Container) -> None:
        for use_case in (
            ListNewsUseCase,
            GetNewsUseCase,
            ListFaqUseCase,
            ListDownloadsUseCase,
            ListWikiPagesUseCase,
            GetWikiPageUseCase,
            SearchWikiUseCase,
            ListCalendarEventsUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
