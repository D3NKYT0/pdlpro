from apps.server.application.account_use_cases import (
    GetLinkSlotsUseCase,
    LinkGameAccountUseCase,
    ListAccessibleAccountsUseCase,
    ListCharactersUseCase,
    RegisterGameAccountUseCase,
    UnlinkGameAccountUseCase,
    UpdateGamePasswordUseCase,
)
from apps.server.application.character_use_cases import (
    ChangeNicknameUseCase,
    ChangeSexUseCase,
    PurchaseLinkSlotUseCase,
    UnstuckCharacterUseCase,
)
from apps.server.application.use_cases import GetRankingUseCase, GetServerStatusUseCase
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.repositories import ILinkSlotRepository, IServicePriceRepository
from apps.server.infrastructure.access import DjangoAccountAccessService
from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.server.infrastructure.repositories import DjangoLinkSlotRepository, DjangoServicePriceRepository
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider
from django.conf import settings


class ServerProvider(AppProvider):
    def register(self, container: Container) -> None:
        if settings.LINEAGE_DB_ENABLED:
            catalog = LineageQueryCatalog.load(getattr(settings, "LINEAGE_QUERY_MODULE", "lucerav2"))
            container.register(LineageQueryCatalog, instance=catalog, lifetime=Lifetime.SINGLETON)
            container.register(ILineageGateway, SqlAlchemyLineageGateway, lifetime=Lifetime.SINGLETON)
        else:
            container.register(ILineageGateway, NullLineageGateway, lifetime=Lifetime.SINGLETON)
        container.register(IServicePriceRepository, DjangoServicePriceRepository, lifetime=Lifetime.SCOPED)
        container.register(ILinkSlotRepository, DjangoLinkSlotRepository, lifetime=Lifetime.SCOPED)
        container.register(IAccountAccessService, DjangoAccountAccessService, lifetime=Lifetime.SCOPED)
        for use_case in (
            GetServerStatusUseCase,
            GetRankingUseCase,
            ListAccessibleAccountsUseCase,
            GetLinkSlotsUseCase,
            RegisterGameAccountUseCase,
            LinkGameAccountUseCase,
            UnlinkGameAccountUseCase,
            ListCharactersUseCase,
            UpdateGamePasswordUseCase,
            ChangeNicknameUseCase,
            ChangeSexUseCase,
            UnstuckCharacterUseCase,
            PurchaseLinkSlotUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
