from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.application.webauthn_service import (
    BeginPasskeyAuthenticationInput,
    BeginPasskeyAuthenticationUseCase,
    BeginPasskeyRegistrationInput,
    BeginPasskeyRegistrationUseCase,
    CompletePasskeyAuthenticationInput,
    CompletePasskeyAuthenticationUseCase,
    CompletePasskeyRegistrationInput,
    CompletePasskeyRegistrationUseCase,
    DeletePasskeyInput,
    DeletePasskeyUseCase,
    ListPasskeysInput,
    ListPasskeysUseCase,
)
from apps.accounts.domain.exceptions import WebAuthnError
from apps.accounts.presentation.auth_cookies import build_auth_response
from apps.accounts.presentation.serializers import (
    PasskeyBeginSerializer,
    PasskeyCompleteSerializer,
    PasskeyCredentialSerializer,
)
from common.views import InjectedAPIView


class PasskeyListView(InjectedAPIView):
    """Entrada HTTP para ``ListPasskeysUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Passkeys"],
        responses=PasskeyCredentialSerializer(many=True),
        summary="Listar passkeys",
        description="Retorna as credenciais passkey registradas pelo usuário autenticado.",
    )
    def get(self, request):
        rows = self.resolve(ListPasskeysUseCase).execute(ListPasskeysInput(user_id=request.user.id))
        return Response(PasskeyCredentialSerializer(rows, many=True).data)


class PasskeyRegisterBeginView(InjectedAPIView):
    """Entrada HTTP para ``BeginPasskeyRegistrationUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Passkeys"],
        request=PasskeyBeginSerializer,
        summary="Iniciar registro de passkey",
        description="Gera o desafio WebAuthn para criar uma nova credencial passkey na conta autenticada.",
    )
    def post(self, request):
        serializer = PasskeyBeginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(BeginPasskeyRegistrationUseCase).execute(
                BeginPasskeyRegistrationInput(
                    user_id=request.user.id,
                    username=request.user.username,
                    display_name=request.user.display_name or request.user.username,
                    nickname=serializer.validated_data.get("nickname", ""),
                )
            )
        )


class PasskeyRegisterCompleteView(InjectedAPIView):
    """Entrada HTTP para ``CompletePasskeyRegistrationUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Passkeys"],
        request=PasskeyCompleteSerializer,
        responses=PasskeyCredentialSerializer,
        summary="Concluir registro de passkey",
        description="Valida a resposta WebAuthn e persiste a nova credencial passkey do usuário.",
    )
    def post(self, request):
        serializer = PasskeyCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            row = self.resolve(CompletePasskeyRegistrationUseCase).execute(
                CompletePasskeyRegistrationInput(
                    user_id=request.user.id,
                    **serializer.validated_data,
                )
            )
        except WebAuthnError as exc:
            return Response({"message": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(PasskeyCredentialSerializer(row).data, status=status.HTTP_201_CREATED)


class PasskeyLoginBeginView(InjectedAPIView):
    """Entrada HTTP para ``BeginPasskeyAuthenticationUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        tags=["Passkeys"],
        request=PasskeyBeginSerializer,
        summary="Iniciar login com passkey",
        description="Gera o desafio WebAuthn para autenticar o usuário com uma passkey existente.",
    )
    def post(self, request):
        serializer = PasskeyBeginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(
            self.resolve(BeginPasskeyAuthenticationUseCase).execute(
                BeginPasskeyAuthenticationInput(login=serializer.validated_data.get("login", ""))
            )
        )


class PasskeyLoginCompleteView(InjectedAPIView):
    """Entrada HTTP para ``CompletePasskeyAuthenticationUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(
        tags=["Passkeys"],
        request=PasskeyCompleteSerializer,
        summary="Concluir login com passkey",
        description="Valida a asserção WebAuthn e inicia a sessão ou o desafio de segundo fator.",
    )
    def post(self, request):
        serializer = PasskeyCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            user = self.resolve(CompletePasskeyAuthenticationUseCase).execute(
                CompletePasskeyAuthenticationInput(
                    state=serializer.validated_data["state"],
                    credential=serializer.validated_data["credential"],
                )
            )
        except WebAuthnError:
            return Response(
                {"message": _("Não foi possível autenticar com esta chave.")},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        from apps.server.application.access import (
            assert_login_allowed_during_coming_soon,
        )
        from apps.server.domain.repositories import IIndexConfigRepository

        assert_login_allowed_during_coming_soon(
            user, self.resolve(IIndexConfigRepository)
        )
        if user.is_2fa_enabled:
            from apps.accounts.application.twofa import make_login_challenge

            return Response({"requires_2fa": True, "challenge": make_login_challenge(user.id)})
        return build_auth_response(request, user)


class PasskeyDeleteView(InjectedAPIView):
    """Entrada HTTP para ``DeletePasskeyUseCase``.

    Implementa DELETE; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Passkeys"],
        summary="Excluir passkey",
        description="Remove uma credencial passkey pertencente ao usuário autenticado.",
    )
    def delete(self, request, credential_id):
        deleted = self.resolve(DeletePasskeyUseCase).execute(
            DeletePasskeyInput(user_id=request.user.id, credential_id=credential_id)
        )
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)
