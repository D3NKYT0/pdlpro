from django.conf import settings
from django.db import models

from common.models import BaseModel


class Notification(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    title = models.CharField(max_length=120)
    body = models.TextField(blank=True)
    kind = models.CharField(max_length=40, default="info")
    link = models.CharField(max_length=500, blank=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Notificação"
        verbose_name_plural = "Notificações"
        ordering = ["-created_at"]


class Friendship(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="friend_requests_sent")
    friend = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="friend_requests_received")
    accepted = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Amizade"
        verbose_name_plural = "Amizades"
        unique_together = ("user", "friend")


class Chat(BaseModel):
    user1 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chats_as_user1")
    user2 = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chats_as_user2")
    last_message = models.TextField(blank=True)

    class Meta:
        verbose_name = "Chat"
        verbose_name_plural = "Chats"
        unique_together = ("user1", "user2")


class ChatMessage(BaseModel):
    chat = models.ForeignKey(Chat, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_chat_messages")
    text = models.TextField()
    is_read = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Mensagem"
        verbose_name_plural = "Mensagens"
        ordering = ["created_at"]


class PushSubscription(BaseModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="push_subscriptions")
    endpoint = models.URLField(max_length=500)
    auth = models.CharField(max_length=255)
    p256dh = models.CharField(max_length=255)

    class Meta:
        verbose_name = "Inscrição push"
        verbose_name_plural = "Inscrições push"
        unique_together = ("user", "endpoint")
