from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.communication.application.friend_use_cases import (
    AcceptFriendRequestUseCase,
    FriendshipActionInput,
    ListFriendsUseCase,
    ListMessagesInput,
    ListMessagesUseCase,
    RejectFriendRequestUseCase,
    RemoveFriendUseCase,
    SearchPlayersInput,
    SearchPlayersUseCase,
    SendFriendRequestInput,
    SendFriendRequestUseCase,
    SendMessageInput,
    SendMessageUseCase,
)
from common.views import InjectedAPIView


class UsernameSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=16)


class SendMessageSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=16)
    text = serializers.CharField(max_length=2000)


class FriendsView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Amigos"])
    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if query:
            return Response(self.resolve(SearchPlayersUseCase).execute(SearchPlayersInput(user_id=request.user.id, query=query)))
        return Response(self.resolve(ListFriendsUseCase).execute(request.user.id))

    @extend_schema(tags=["Amigos"], request=UsernameSerializer)
    def post(self, request):
        serializer = UsernameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(SendFriendRequestUseCase).execute(
                SendFriendRequestInput(user_id=request.user.id, username=serializer.validated_data["username"])
            )
        )


class FriendActionView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Amigos"])
    def post(self, request, friendship_id, action: str):
        payload = FriendshipActionInput(user_id=request.user.id, friendship_id=friendship_id)
        mapping = {
            "accept": AcceptFriendRequestUseCase,
            "reject": RejectFriendRequestUseCase,
            "cancel": RejectFriendRequestUseCase,
            "remove": RemoveFriendUseCase,
        }
        use_case = mapping.get(action)
        if use_case is None:
            from common.architecture.exceptions import ValidationDomainError

            raise ValidationDomainError("Ação inválida.")
        return Response(self.resolve(use_case).execute(payload))


class MessagesView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Mensagens"])
    def get(self, request):
        username = request.query_params.get("username", "")
        return Response(
            self.resolve(ListMessagesUseCase).execute(ListMessagesInput(user_id=request.user.id, username=username))
        )

    @extend_schema(tags=["Mensagens"], request=SendMessageSerializer)
    def post(self, request):
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(SendMessageUseCase).execute(SendMessageInput(user_id=request.user.id, **serializer.validated_data))
        )
