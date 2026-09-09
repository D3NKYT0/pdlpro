from apps.programs.application.use_cases import (
    CreateRoadmapEntryUseCase,
    DeleteRoadmapEntryUseCase,
    GetSupporterDashboardUseCase,
    ListPublishedRoadmapUseCase,
    ListResourcesUseCase,
    ListStaffRoadmapUseCase,
    ListStaffSupportersUseCase,
    RequestCommissionPayoutUseCase,
    ReviewPayoutUseCase,
    ReviewSupporterUseCase,
    UpdateResourceUseCase,
    UpdateRoadmapEntryUseCase,
    UpsertSupporterUseCase,
)
from apps.programs.domain.preview_seed import IPreviewSeedService
from apps.programs.domain.repositories import (
    IRoadmapRepository,
    ISupporterRepository,
    ISystemResourceRepository,
)
from apps.programs.infrastructure.preview_seed import DjangoPreviewSeedService
from apps.programs.infrastructure.repositories import (
    DjangoRoadmapRepository,
    DjangoSupporterRepository,
    DjangoSystemResourceRepository,
)
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ProgramsProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo programs.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(ISupporterRepository, DjangoSupporterRepository, lifetime=Lifetime.SCOPED)
        container.register(IRoadmapRepository, DjangoRoadmapRepository, lifetime=Lifetime.SCOPED)
        container.register(
            ISystemResourceRepository, DjangoSystemResourceRepository, lifetime=Lifetime.SCOPED
        )
        container.register(
            IPreviewSeedService, DjangoPreviewSeedService, lifetime=Lifetime.TRANSIENT
        )
        for use_case in (
            GetSupporterDashboardUseCase,
            UpsertSupporterUseCase,
            RequestCommissionPayoutUseCase,
            ListStaffSupportersUseCase,
            ReviewSupporterUseCase,
            ReviewPayoutUseCase,
            ListPublishedRoadmapUseCase,
            ListStaffRoadmapUseCase,
            CreateRoadmapEntryUseCase,
            UpdateRoadmapEntryUseCase,
            DeleteRoadmapEntryUseCase,
            ListResourcesUseCase,
            UpdateResourceUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
