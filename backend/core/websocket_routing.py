from django.urls import path

from apps.communication.presentation.consumers import FriendChatConsumer

websocket_urlpatterns = [
    path("ws/chat/<str:username>/", FriendChatConsumer.as_asgi()),
]
