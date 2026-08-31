from apps.communication.application.notify import NotifyUser
from apps.communication.application.push_use_cases import (
    GetVapidPublicKeyUseCase,
    SubscribePushUseCase,
    UnsubscribePushUseCase,
)
from apps.communication.application.use_cases import ListNotificationsUseCase, MarkNotificationReadUseCase
from apps.communication.domain.push import IPushSender
from apps.communication.domain.repositories import INotificationRepository
from apps.communication.infrastructure.push import WebPushSender
from apps.communication.infrastructure.repositories import DjangoNotificationRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class CommunicationProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(INotificationRepository, DjangoNotificationRepository, lifetime=Lifetime.SCOPED)
        container.register(IPushSender, WebPushSender, lifetime=Lifetime.SINGLETON)
        container.register_self(NotifyUser, lifetime=Lifetime.TRANSIENT)
        for use_case in (
            ListNotificationsUseCase,
            MarkNotificationReadUseCase,
            GetVapidPublicKeyUseCase,
            SubscribePushUseCase,
            UnsubscribePushUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
