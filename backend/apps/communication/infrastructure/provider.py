from apps.communication.application.use_cases import ListNotificationsUseCase, MarkNotificationReadUseCase
from apps.communication.domain.repositories import INotificationRepository
from apps.communication.infrastructure.repositories import DjangoNotificationRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class CommunicationProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(INotificationRepository, DjangoNotificationRepository, lifetime=Lifetime.SCOPED)
        container.register_self(ListNotificationsUseCase, lifetime=Lifetime.TRANSIENT)
        container.register_self(MarkNotificationReadUseCase, lifetime=Lifetime.TRANSIENT)
