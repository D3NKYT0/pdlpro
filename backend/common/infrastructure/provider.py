from common.architecture.base import UnitOfWork
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider
from common.infrastructure.unit_of_work import DjangoUnitOfWork


class CommonProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(UnitOfWork, DjangoUnitOfWork, lifetime=Lifetime.SCOPED)
