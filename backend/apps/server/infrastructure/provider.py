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
    ListCharacterSkillsUseCase,
    ListCharactersUseCase,
    RegisterGameAccountUseCase,
    RequestLinkByEmailUseCase,
    SetActiveAccountUseCase,
    UnlinkGameAccountUseCase,
    UpdateGamePasswordUseCase,
)
from apps.server.application.character_use_cases import (
    ChangeAppearanceUseCase,
    ChangeNicknameUseCase,
    ChangeSexUseCase,
    ClearKarmaUseCase,
    ClearPkUseCase,
    ListServicePricesUseCase,
    PurchaseLinkSlotUseCase,
    TeleportCharacterUseCase,
    UnstuckCharacterUseCase,
)
from apps.server.application.custom_items import (
    GetCustomItemUseCase,
    ListCustomItemsUseCase,
    UpsertCustomItemUseCase,
)
from apps.server.application.item_catalog_use_cases import (
    ItemIsTradeableUseCase,
    ListPublicItemCatalogUseCase,
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
from apps.server.application.moderation_use_cases import (
    ApplyModerationActionUseCase,
    GetModerationCharacterUseCase,
    SearchModerationCharactersUseCase,
)
from apps.server.application.store_use_cases import ListGameStoresUseCase
from apps.server.application.use_cases import (
    GetRankingUseCase,
    GetServerInfoUseCase,
    GetServerStatusUseCase,
    RunPublicLineageQueryUseCase,
)
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.item_catalog import IItemCatalog, IItemDisplayName
from apps.server.domain.repositories import (
    ICharacterServiceOperationRepository,
    ICustomItemRepository,
    IIndexConfigRepository,
    IItemObservationRepository,
    ILinkSlotRepository,
    IManagedLineageAccountRepository,
    IModerationStateRepository,
    IServicePriceRepository,
)
from apps.server.domain.site_metadata import IPackagedSiteMetadata
from apps.server.domain.skill_catalog import ISkillCatalog
from apps.server.infrastructure.access import DjangoAccountAccessService
from apps.server.infrastructure.empty_site_metadata import EmptyPackagedSiteMetadata
from apps.server.infrastructure.item_catalog_adapter import LineageItemCatalogAdapter
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.moderation_repository import (
    DjangoModerationStateRepository,
)
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
from apps.server.infrastructure.skill_catalog_adapter import LineageSkillCatalogAdapter
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider
from extensions.loader import lineage_query_roots


class ServerProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo server.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        if settings.LINEAGE_DB_ENABLED:
            # O catálogo é carregado no boot; alterações nos arquivos .sql exigem recarregar o processo.
            catalog = LineageQueryCatalog.load(
                getattr(settings, "LINEAGE_QUERY_MODULE", "lucerav2"),
                extra_roots=lineage_query_roots(),
            )
            container.register(LineageQueryCatalog, instance=catalog, lifetime=Lifetime.SINGLETON)
            container.register(ILineageGateway, SqlAlchemyLineageGateway, lifetime=Lifetime.SINGLETON)
        else:
            container.register(ILineageGateway, NullLineageGateway, lifetime=Lifetime.SINGLETON)
        container.register(IServicePriceRepository, DjangoServicePriceRepository, lifetime=Lifetime.SCOPED)
        container.register(IIndexConfigRepository, DjangoIndexConfigRepository, lifetime=Lifetime.SCOPED)
        container.register(IPackagedSiteMetadata, EmptyPackagedSiteMetadata, lifetime=Lifetime.SINGLETON)
        container.register(ILinkSlotRepository, DjangoLinkSlotRepository, lifetime=Lifetime.SCOPED)
        container.register(
            IManagedLineageAccountRepository,
            DjangoManagedLineageAccountRepository,
            lifetime=Lifetime.SCOPED,
        )
        container.register(ICustomItemRepository, DjangoCustomItemRepository, lifetime=Lifetime.SCOPED)
        container.register(IItemObservationRepository, DjangoItemObservationRepository, lifetime=Lifetime.SCOPED)
        container.register(IModerationStateRepository, DjangoModerationStateRepository, lifetime=Lifetime.SCOPED)
        container.register(
            ICharacterServiceOperationRepository,
            DjangoCharacterServiceOperationRepository,
            lifetime=Lifetime.SCOPED,
        )
        item_catalog = LineageItemCatalogAdapter()
        container.register(IItemCatalog, instance=item_catalog, lifetime=Lifetime.SINGLETON)
        container.register(IItemDisplayName, instance=item_catalog, lifetime=Lifetime.SINGLETON)
        container.register(ISkillCatalog, LineageSkillCatalogAdapter, lifetime=Lifetime.SINGLETON)
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
            SetActiveAccountUseCase,
            LinkGameAccountUseCase,
            UnlinkGameAccountUseCase,
            ListCharactersUseCase,
            GetCharacterUseCase,
            ListCharacterSkillsUseCase,
            UpdateGamePasswordUseCase,
            ChangeNicknameUseCase,
            ChangeSexUseCase,
            UnstuckCharacterUseCase,
            TeleportCharacterUseCase,
            ChangeAppearanceUseCase,
            ClearKarmaUseCase,
            ClearPkUseCase,
            ListServicePricesUseCase,
            ListGameStoresUseCase,
            PurchaseLinkSlotUseCase,
            RequestLinkByEmailUseCase,
            ConfirmLinkByEmailUseCase,
            ListCustomItemsUseCase,
            GetCustomItemUseCase,
            UpsertCustomItemUseCase,
            ListPublicItemCatalogUseCase,
            ItemIsTradeableUseCase,
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
            SearchModerationCharactersUseCase,
            GetModerationCharacterUseCase,
            ApplyModerationActionUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
