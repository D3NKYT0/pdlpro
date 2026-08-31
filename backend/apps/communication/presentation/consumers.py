from __future__ import annotations

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from apps.communication.application.friend_use_cases import SendMessageInput, SendMessageUseCase
from common.di.bootstrap import DependencyInjection


class FriendChatConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        peer = (self.scope.get("url_route") or {}).get("kwargs", {}).get("username", "")
        if isinstance(user, AnonymousUser) or not getattr(user, "is_authenticated", False) or not peer:
            await self.close(code=4401)
            return
        peer_id = await self._peer_id(user.id, peer)
        if peer_id is None:
            await self.close(code=4403)
            return
        self.peer = peer
        self.room_name = self._room_name(str(user.id), str(peer_id))
        await self.channel_layer.group_add(self.room_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        if getattr(self, "room_name", None):
            await self.channel_layer.group_discard(self.room_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        text = str(content.get("text") or "")
        try:
            payload = await self._persist(text)
        except Exception as exc:
            await self.send_json({"error": str(exc)})
            return
        await self.channel_layer.group_send(self.room_name, {"type": "chat.message", "payload": payload})

    async def chat_message(self, event):
        await self.send_json(event["payload"])

    def _room_name(self, user_id: str, peer: str) -> str:
        left, right = sorted([user_id.lower(), peer.lower()])
        return f"chat_{left}_{right}"

    @database_sync_to_async
    def _peer_id(self, user_id, username: str):
        from django.contrib.auth import get_user_model

        from apps.communication.infrastructure.models import Friendship

        other = get_user_model().objects.filter(username__iexact=username).first()
        if other is None:
            return None
        if not Friendship.objects.filter(user__id=user_id, friend=other, accepted=True).exists():
            return None
        return other.id

    @database_sync_to_async
    def _persist(self, text: str) -> dict:
        return DependencyInjection.root().resolve(SendMessageUseCase).execute(
            SendMessageInput(user_id=self.scope["user"].id, username=self.peer, text=text)
        )
