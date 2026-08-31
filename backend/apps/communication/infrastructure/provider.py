from apps.communication.application.friend_use_cases import (
    AcceptFriendRequestUseCase,
    ListFriendsUseCase,
    ListMessagesUseCase,
    RejectFriendRequestUseCase,
    RemoveFriendUseCase,
    SearchPlayersUseCase,
    SendFriendRequestUseCase,
    SendMessageUseCase,
)
from apps.communication.application.use_cases import ListNotificationsUseCase, MarkNotificationReadUseCase
from apps.communication.domain.repositories import INotificationRepository
from apps.communication.infrastructure.repositories import DjangoNotificationRepository
from common.di.container import Container
from common.di.lifetime import Lifetime
from common.di.provider import AppProvider


class CommunicationProvider(AppProvider):
    def register(self, container: Container) -> None:
        container.register(INotificationRepository, DjangoNotificationRepository, lifetime=Lifetime.SCOPED)
        for use_case in (
            ListNotificationsUseCase,
            MarkNotificationReadUseCase,
            ListFriendsUseCase,
            SearchPlayersUseCase,
            SendFriendRequestUseCase,
            AcceptFriendRequestUseCase,
            RejectFriendRequestUseCase,
            RemoveFriendUseCase,
            ListMessagesUseCase,
            SendMessageUseCase,
        ):
            container.register_self(use_case, lifetime=Lifetime.TRANSIENT)
