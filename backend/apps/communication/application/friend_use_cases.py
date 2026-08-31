from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.db.models import Q

from apps.communication.application.notify import NotifyUser
from apps.communication.domain.push import IPushSender
from apps.communication.infrastructure.models import Chat, ChatMessage, Friendship
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def _dump_friendship(row: Friendship, *, other) -> dict:
    return {
        "id": str(row.id),
        "username": other.username,
        "user_id": str(other.id),
        "accepted": row.accepted,
    }


class ListFriendsUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        accepted = Friendship.objects.select_related("friend").filter(user__id=data, accepted=True)
        incoming = Friendship.objects.select_related("user").filter(friend__id=data, accepted=False)
        outgoing = Friendship.objects.select_related("friend").filter(user__id=data, accepted=False)
        return {
            "friends": [_dump_friendship(row, other=row.friend) for row in accepted],
            "incoming": [_dump_friendship(row, other=row.user) for row in incoming],
            "outgoing": [_dump_friendship(row, other=row.friend) for row in outgoing],
        }


@dataclass(frozen=True, slots=True)
class SearchPlayersInput:
    user_id: UUID
    query: str


class SearchPlayersUseCase(UseCase[SearchPlayersInput, list[dict]]):
    def execute(self, data: SearchPlayersInput) -> list[dict]:
        from django.contrib.auth import get_user_model

        query = data.query.strip()
        if len(query) < 2:
            return []
        blocked = set(
            Friendship.objects.filter(Q(user__id=data.user_id) | Q(friend__id=data.user_id)).values_list(
                "user__id", "friend__id"
            )
        )
        exclude = {data.user_id}
        for pair in blocked:
            exclude.update(pair)
        users = get_user_model().objects.exclude(id__in=exclude).filter(username__icontains=query)[:20]
        return [{"id": str(user.id), "username": user.username} for user in users]


@dataclass(frozen=True, slots=True)
class SendFriendRequestInput:
    user_id: UUID
    username: str


class SendFriendRequestUseCase(UseCase[SendFriendRequestInput, dict]):
    def __init__(self, notifier: NotifyUser) -> None:
        self._notifier = notifier

    def execute(self, data: SendFriendRequestInput) -> dict:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        me = User.objects.get(id=data.user_id)
        other = User.objects.filter(username__iexact=data.username.strip()).first()
        if other is None:
            raise EntityNotFoundError("Jogador não encontrado.")
        if other.id == me.id:
            raise ValidationDomainError("Você não pode adicionar a si mesmo.")
        if Friendship.objects.filter(user=me, friend=other).exists():
            raise ValidationDomainError("Pedido já enviado.")
        incoming = Friendship.objects.filter(user=other, friend=me, accepted=False).first()
        if incoming:
            incoming.accepted = True
            incoming.save(update_fields=["accepted", "updated_at"])
            Friendship.objects.get_or_create(user=me, friend=other, defaults={"accepted": True})
            return {"id": str(incoming.id), "accepted": True, "username": other.username}
        row = Friendship.objects.create(user=me, friend=other, accepted=False)
        self._notifier.send(
            other.id,
            title="Pedido de amizade",
            body=f"{me.username} quer ser seu amigo.",
            kind="friend",
            link="/friends",
        )
        return {"id": str(row.id), "accepted": False, "username": other.username}


@dataclass(frozen=True, slots=True)
class FriendshipActionInput:
    user_id: UUID
    friendship_id: UUID


class AcceptFriendRequestUseCase(UseCase[FriendshipActionInput, dict]):
    def execute(self, data: FriendshipActionInput) -> dict:
        row = Friendship.objects.select_related("user", "friend").filter(id=data.friendship_id, friend__id=data.user_id).first()
        if row is None:
            raise EntityNotFoundError("Pedido não encontrado.")
        row.accepted = True
        row.save(update_fields=["accepted", "updated_at"])
        Friendship.objects.get_or_create(user=row.friend, friend=row.user, defaults={"accepted": True})
        return {"id": str(row.id), "accepted": True, "username": row.user.username}


class RejectFriendRequestUseCase(UseCase[FriendshipActionInput, dict]):
    def execute(self, data: FriendshipActionInput) -> dict:
        row = Friendship.objects.filter(id=data.friendship_id).filter(
            Q(friend__id=data.user_id, accepted=False) | Q(user__id=data.user_id, accepted=False)
        ).first()
        if row is None:
            raise EntityNotFoundError("Pedido não encontrado.")
        row.delete()
        return {"deleted": True}


class RemoveFriendUseCase(UseCase[FriendshipActionInput, dict]):
    def execute(self, data: FriendshipActionInput) -> dict:
        row = Friendship.objects.filter(id=data.friendship_id).filter(
            Q(user__id=data.user_id) | Q(friend__id=data.user_id)
        ).first()
        if row is None:
            raise EntityNotFoundError("Amizade não encontrada.")
        Friendship.objects.filter(
            Q(user=row.user, friend=row.friend) | Q(user=row.friend, friend=row.user)
        ).delete()
        return {"deleted": True}


def _ordered_pair(user_a, user_b):
    if str(user_a.id) < str(user_b.id):
        return user_a, user_b
    return user_b, user_a


@dataclass(frozen=True, slots=True)
class ListMessagesInput:
    user_id: UUID
    username: str


class ListMessagesUseCase(UseCase[ListMessagesInput, list[dict]]):
    def execute(self, data: ListMessagesInput) -> list[dict]:
        from django.contrib.auth import get_user_model

        other = get_user_model().objects.filter(username__iexact=data.username).first()
        if other is None:
            raise EntityNotFoundError("Jogador não encontrado.")
        if not Friendship.objects.filter(user__id=data.user_id, friend=other, accepted=True).exists():
            raise ValidationDomainError("Vocês não são amigos.")
        me = get_user_model().objects.get(id=data.user_id)
        first, second = _ordered_pair(me, other)
        chat = Chat.objects.filter(user1=first, user2=second).first()
        if chat is None:
            return []
        ChatMessage.objects.filter(chat=chat).exclude(sender=me).update(is_read=True)
        return [
            {
                "id": str(msg.id),
                "sender": msg.sender.username,
                "text": msg.text,
                "is_read": msg.is_read,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in chat.messages.select_related("sender")
        ]


@dataclass(frozen=True, slots=True)
class SendMessageInput:
    user_id: UUID
    username: str
    text: str


class SendMessageUseCase(UseCase[SendMessageInput, dict]):
    def __init__(self, push: IPushSender) -> None:
        self._push = push

    def execute(self, data: SendMessageInput) -> dict:
        from django.contrib.auth import get_user_model

        text = data.text.strip()
        if not text:
            raise ValidationDomainError("Escreva uma mensagem.")
        User = get_user_model()
        me = User.objects.get(id=data.user_id)
        other = User.objects.filter(username__iexact=data.username).first()
        if other is None:
            raise EntityNotFoundError("Jogador não encontrado.")
        if not Friendship.objects.filter(user=me, friend=other, accepted=True).exists():
            raise ValidationDomainError("Vocês não são amigos.")
        first, second = _ordered_pair(me, other)
        chat, _ = Chat.objects.get_or_create(user1=first, user2=second)
        msg = ChatMessage.objects.create(chat=chat, sender=me, text=text)
        chat.last_message = text
        chat.save(update_fields=["last_message", "updated_at"])
        self._push.send(
            other.id,
            title=f"Mensagem de {me.username}",
            body=text[:140],
            url="/friends",
        )
        return {
            "id": str(msg.id),
            "sender": me.username,
            "text": msg.text,
            "is_read": False,
            "created_at": msg.created_at.isoformat(),
        }
