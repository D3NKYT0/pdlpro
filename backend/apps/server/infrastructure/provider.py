from django.conf import settings

from apps.server.application.account_use_cases import (
    ConfirmLinkByEmailUseCase,
    ForceUnlinkGameAccountUseCase,
    GetCharacterUseCase,
    GetLinkSlotsUseCase,
    InspectGameAccountUseCase,
    InspectPrimaryLoginUseCase,
    LinkGameAccountUseCase,
    ListAccessibleAccountsUseCase,
    ListCharactersUseCase,
    RegisterGameAccountUseCase,
    RequestLinkByEmailUseCase,
    UnlinkGameAccountUseCase,
    UpdateGamePasswordUseCase,
)
from apps.server.application.character_use_cases import (
    ChangeNicknameUseCase,
    ChangeSexUseCase,
    ListServicePricesUseCase,
    PurchaseLinkSlotUseCase,
    UnstuckCharacterUseCase,
)
from apps.server.application.custom_items import (
    GetCustomItemUseCase,
    ListCustomItemsUseCase,
    UpsertCustomItemUseCase,
)
from apps.server.application.item_observation import (
    CaptureObservationSnapshotUseCase,
    CompareObservationSnapshotsUseCase,
    DeleteObservationCategoryUseCase,
    DeleteObservationSnapshotUseCase,
    GetObservationCategoryUseCase,
    GetObservationSnapshotUseCase,
    ListLiveObservationUseCase,
    ListObservationCategoriesUseCase,
    ListObservationSnapshotsUseCase,
    SetObservationFavoriteUseCase,
    UpsertObservationCategoryUseCase,
)
from apps.server.application.use_cases import (
    GetRankingUseCase,
    GetServerInfoUseCase,
    GetServerStatusUseCase,
    RunPublicLineageQueryUseCase,
)
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.repositories import (
    ICharacterServiceOperationRepository,
    ICustomItemRepository,
    IIndexConfigRepository,
    IItemObservationRepository,
    ILinkSlotRepository,
    IManagedLineageAccountRepository,
    IServicePriceRepository,
)
from apps.server.infrastructure.access import DjangoAccountAccessService
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.server.infrastructure.repositories import (
    DjangoCharacterServiceOperationRepository,
    DjangoCustomItemRepository,
    DjangoIndexConfigRepository,
    DjangoItemObservationRepository,
    DjangoLinkSlotRepository,
    DjangoManagedLineageAccountRepository,
    DjangoServicePriceRepository,
)
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ServerProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo server.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        if settings.LINEAGE_DB_ENABLED:
            # O catálogo é carregado no boot; alterações nos arquivos .sql exigem recarregar o processo.
            catalog = LineageQueryCatalog.load(getattr(settings, "LINEAGE_QUERY_MODULE", "lucerav2"))
            container.register(LineageQueryCatalog, instance=catalog, lifetime=Lifetime.SINGLETON)
            container.register(ILineageGateway, SqlAlchemyLineageGateway, lifetime=Lifetime.SINGLETON)
        else:
            container.register(ILineageGateway, NullLineageGateway, lifetime=Lifetime.SINGLETON)
        container.register(IServicePriceRepository, DjangoServicePriceRepository, lifetime=Lifetime.SCOPED)
        container.register(IIndexConfigRepository, DjangoIndexConfigRepository, lifetime=Lifetime.SCOPED)
        container.register(ILinkSlotRepository, DjangoLinkSlotRepository, lifetime=Lifetime.SCOPED)
        container.register(
            IManagedLineageAccountRepository,
            DjangoManagedLineageAccountRepository,
            lifetime=Lifetime.SCOPED,
        )
        container.register(ICustomItemRepository, DjangoCustomItemRepository, lifetime=Lifetime.SCOPED)
        container.register(IItemObservationRepository, DjangoItemObservationRepository, lifetime=Lifetime.SCOPED)
        container.register(
            ICharacterServiceOperationRepository,
            DjangoCharacterServiceOperationRepository,
            lifetime=Lifetime.SCOPED,
        )
        container.register(IAccountAccessService, DjangoAccountAccessService, lifetime=Lifetime.SCOPED)
        for use_case in (
            GetServerInfoUseCase,
            GetServerStatusUseCase,
            GetRankingUseCase,
            RunPublicLineageQueryUseCase,
            ListAccessibleAccountsUseCase,
            GetLinkSlotsUseCase,
            InspectPrimaryLoginUseCase,
            InspectGameAccountUseCase,
            ForceUnlinkGameAccountUseCase,
            RegisterGameAccountUseCase,
            LinkGameAccountUseCase,
            UnlinkGameAccountUseCase,
            ListCharactersUseCase,
            GetCharacterUseCase,
            UpdateGamePasswordUseCase,
            ChangeNicknameUseCase,
            ChangeSexUseCase,
            UnstuckCharacterUseCase,
            ListServicePricesUseCase,
            PurchaseLinkSlotUseCase,
            RequestLinkByEmailUseCase,
            ConfirmLinkByEmailUseCase,
            ListCustomItemsUseCase,
            GetCustomItemUseCase,
            UpsertCustomItemUseCase,
            ListLiveObservationUseCase,
            SetObservationFavoriteUseCase,
            ListObservationSnapshotsUseCase,
            CaptureObservationSnapshotUseCase,
            GetObservationSnapshotUseCase,
            DeleteObservationSnapshotUseCase,
            CompareObservationSnapshotsUseCase,
            ListObservationCategoriesUseCase,
            GetObservationCategoryUseCase,
            UpsertObservationCategoryUseCase,
            DeleteObservationCategoryUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
