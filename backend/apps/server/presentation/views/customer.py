from drf_spectacular.utils import extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.server.application.account_use_cases import (
    AccountActor,
    GetLinkSlotsUseCase,
    LinkGameAccountInput,
    LinkGameAccountUseCase,
    ListAccessibleAccountsUseCase,
    ListCharactersInput,
    ListCharactersUseCase,
    RegisterGameAccountInput,
    RegisterGameAccountUseCase,
    UnlinkGameAccountInput,
    UnlinkGameAccountUseCase,
    UpdateGamePasswordInput,
    UpdateGamePasswordUseCase,
)
from apps.server.application.character_use_cases import (
    ChangeNicknameUseCase,
    ChangeSexUseCase,
    CharacterServiceInput,
    PurchaseLinkSlotInput,
    PurchaseLinkSlotUseCase,
    UnstuckCharacterUseCase,
)
from apps.server.presentation.serializers import (
    AccessibleAccountSerializer,
    ChangeNicknameSerializer,
    ChangeSexSerializer,
    GameAccountSerializer,
    GameCharacterSerializer,
    LinkGameAccountSerializer,
    PurchaseSlotSerializer,
    RegisterGameAccountSerializer,
    UnlinkGameAccountSerializer,
    UnstuckSerializer,
    UpdateGamePasswordSerializer,
)
from common.views import InjectedAPIView


def actor_from(request) -> AccountActor:
    return AccountActor(user_id=request.user.id, username=request.user.username, email=request.user.email)


class LineageAccountsView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"])
    def get(self, request):
        accounts = self.resolve(ListAccessibleAccountsUseCase).execute(actor_from(request))
        slots = self.resolve(GetLinkSlotsUseCase).execute(actor_from(request))
        return Response({"accounts": AccessibleAccountSerializer(accounts, many=True).data, "slots": slots})


class RegisterGameAccountView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=RegisterGameAccountSerializer)
    def post(self, request):
        serializer = RegisterGameAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = self.resolve(RegisterGameAccountUseCase).execute(
            RegisterGameAccountInput(actor=actor_from(request), password=serializer.validated_data["password"])
        )
        return Response(GameAccountSerializer(account).data)


class LinkGameAccountView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=LinkGameAccountSerializer)
    def post(self, request):
        serializer = LinkGameAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        account = self.resolve(LinkGameAccountUseCase).execute(
            LinkGameAccountInput(
                actor=actor_from(request),
                login=serializer.validated_data["login"],
                password=serializer.validated_data["password"],
            )
        )
        return Response(GameAccountSerializer(account).data)


class UnlinkGameAccountView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=UnlinkGameAccountSerializer)
    def post(self, request):
        serializer = UnlinkGameAccountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.resolve(UnlinkGameAccountUseCase).execute(
            UnlinkGameAccountInput(actor=actor_from(request), login=serializer.validated_data["login"])
        )
        return Response({"ok": True})


class CharactersView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"])
    def get(self, request):
        login = request.query_params.get("login") or request.user.username
        chars = self.resolve(ListCharactersUseCase).execute(
            ListCharactersInput(actor=actor_from(request), login=login)
        )
        return Response(GameCharacterSerializer(chars, many=True).data)


class UpdateGamePasswordView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=UpdateGamePasswordSerializer)
    def post(self, request):
        serializer = UpdateGamePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.resolve(UpdateGamePasswordUseCase).execute(
            UpdateGamePasswordInput(
                actor=actor_from(request),
                login=serializer.validated_data.get("login") or request.user.username,
                password=serializer.validated_data["password"],
            )
        )
        return Response({"ok": True})


class ChangeNicknameView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=ChangeNicknameSerializer)
    def post(self, request):
        serializer = ChangeNicknameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(ChangeNicknameUseCase).execute(
            (
                CharacterServiceInput(
                    user_id=request.user.id,
                    username=request.user.username,
                    login=data["login"],
                    char_id=data["char_id"],
                ),
                data["name"],
            )
        )
        return Response({"ok": True})


class ChangeSexView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=ChangeSexSerializer)
    def post(self, request):
        serializer = ChangeSexSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(ChangeSexUseCase).execute(
            (
                CharacterServiceInput(
                    user_id=request.user.id,
                    username=request.user.username,
                    login=data["login"],
                    char_id=data["char_id"],
                ),
                data["sex"],
            )
        )
        return Response({"ok": True})


class UnstuckView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=UnstuckSerializer)
    def post(self, request):
        serializer = UnstuckSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        self.resolve(UnstuckCharacterUseCase).execute(
            CharacterServiceInput(
                user_id=request.user.id,
                username=request.user.username,
                login=data["login"],
                char_id=data["char_id"],
            )
        )
        return Response({"ok": True})


class PurchaseSlotView(InjectedAPIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Conta Lineage"], request=PurchaseSlotSerializer)
    def post(self, request):
        serializer = PurchaseSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = self.resolve(PurchaseLinkSlotUseCase).execute(
            PurchaseLinkSlotInput(user_id=request.user.id, quantity=serializer.validated_data["quantity"])
        )
        return Response(result)
