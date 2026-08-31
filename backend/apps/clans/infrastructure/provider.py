from apps.clans.application.use_cases import (
    ApplyToClanUseCase,
    CreateClanUseCase,
    ListClanApplicationsUseCase,
    ListMyApplicationsUseCase,
    ListPublicClansUseCase,
    ReviewApplicationUseCase,
)
from apps.clans.domain.repositories import IClanApplicationRepository, IClanRepository
from apps.clans.infrastructure.repositories import DjangoClanApplicationRepository, DjangoClanRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ClansProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(IClanRepository, DjangoClanRepository, lifetime=Lifetime.SCOPED)
        container.register(IClanApplicationRepository, DjangoClanApplicationRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListPublicClansUseCase,
            CreateClanUseCase,
            ApplyToClanUseCase,
            ListMyApplicationsUseCase,
            ListClanApplicationsUseCase,
            ReviewApplicationUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
