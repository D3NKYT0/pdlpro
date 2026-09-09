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
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ProgramsProvider(AppProvider):
    """Registra os casos de uso do módulo programs.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
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
