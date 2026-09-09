from apps.support.application.use_cases import (
    CreateTicketUseCase,
    GetCustomerTicketUseCase,
    GetStaffTicketUseCase,
    ListCustomerTicketsUseCase,
    ListStaffTicketsUseCase,
    ReplyCustomerTicketUseCase,
    ReplyStaffTicketUseCase,
    UpdateCustomerTicketUseCase,
    UpdateStaffTicketUseCase,
)
from apps.support.domain.repositories import ITicketRepository
from apps.support.infrastructure.repositories import DjangoTicketRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class SupportProvider(AppProvider):
    """Registra portas, adaptadores e casos de uso do módulo support.

    O AppConfig inclui este provider no catálogo de DependencyInjection. Acrescente novos
    registros em ``register`` e escolha o lifetime conforme o estado mantido pelo serviço; views
    resolvem essas classes pelo container.
    """

    def register(self, container: Container) -> None:
        container.register(ITicketRepository, DjangoTicketRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListCustomerTicketsUseCase,
            CreateTicketUseCase,
            GetCustomerTicketUseCase,
            ReplyCustomerTicketUseCase,
            UpdateCustomerTicketUseCase,
            ListStaffTicketsUseCase,
            GetStaffTicketUseCase,
            ReplyStaffTicketUseCase,
            UpdateStaffTicketUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
