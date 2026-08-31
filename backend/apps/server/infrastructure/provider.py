from django.conf import settings

from apps.server.application.use_cases import GetRankingUseCase, GetServerStatusUseCase
from apps.server.domain.gateways import ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class ServerProvider(AppProvider):
    def register(self, container: Container) -> None:
        gateway_cls = SqlAlchemyLineageGateway if settings.LINEAGE_DB_ENABLED else NullLineageGateway
        container.register(ILineageGateway, gateway_cls, lifetime=Lifetime.SINGLETON)
        container.register_self(GetServerStatusUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(GetRankingUseCase, lifetime=Lifetime.TRANSIENT)
