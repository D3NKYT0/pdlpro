from common.architecture.base import UnitOfWork
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider
from common.infrastructure.unit_of_work import DjangoUnitOfWork


class CommonProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo common.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(UnitOfWork, DjangoUnitOfWork, lifetime=Lifetime.SCOPED)
