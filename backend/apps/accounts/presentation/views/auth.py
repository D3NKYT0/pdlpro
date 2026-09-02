from django.middleware.csrf import get_token
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.application.twofa import (
    ConfirmTwoFactorInput,
    ConfirmTwoFactorUseCase,
    DisableTwoFactorInput,
    DisableTwoFactorUseCase,
    SetupTwoFactorUseCase,
    VerifyTwoFactorLoginInput,
    VerifyTwoFactorLoginUseCase,
    make_login_challenge,
)
from apps.accounts.application.captcha import captcha_required, clear_failures, register_failure, verify_hcaptcha
from apps.accounts.application.oauth import begin_oauth, complete_oauth
from apps.accounts.domain.exceptions import InvalidCredentialsError
from apps.accounts.application.progress_use_cases import ClaimRewardInput, ClaimRewardUseCase, GetGamerProfileUseCase
from apps.accounts.application.email_use_cases import (
    ConfirmPasswordResetInput,
    ConfirmPasswordResetUseCase,
    RequestEmailVerificationUseCase,
    RequestPasswordResetInput,
    RequestPasswordResetUseCase,
    VerifyEmailInput,
    VerifyEmailUseCase,
)
from apps.accounts.application.use_cases import (
    AuthenticateUserInput,
    AuthenticateUserUseCase,
    GetCurrentUserInput,
    GetCurrentUserUseCase,
    RegisterUserInput,
    RegisterUserUseCase,
    UpdateProfileInput,
    UpdateProfileUseCase,
)
from apps.accounts.infrastructure.authentication import (
    build_auth_response,
    clear_auth_cookies,
    get_refresh_cookie_name,
    set_auth_cookies,
)
from apps.accounts.presentation.serializers import (
    LoginSerializer,
    OAuthBeginSerializer,
    OAuthCompleteSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)
from common.views import InjectedAPIView
from apps.server.presentation.item_metadata import ItemCatalogAPIView


class CsrfView(InjectedAPIView):
    """Disponibiliza o token CSRF necessário às requisições de escrita por cookie.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Auth"])
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(InjectedAPIView):
    """Entrada HTTP para ``RegisterUserUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"], request=RegisterSerializer, responses=UserSerializer)
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        from django.conf import settings

        if settings.HCAPTCHA_ENABLED and not verify_hcaptcha(data.get("hcaptcha_token", ""), request.META.get("REMOTE_ADDR", "")):
            return Response(
                {"message": "Resolva o CAPTCHA para criar sua conta.", "details": {"captcha_required": True}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = self.resolve(RegisterUserUseCase).execute(
            RegisterUserInput(
                username=data["username"],
                email=data["email"],
                password=data["password"],
                display_name=data.get("display_name", ""),
                accept_terms=data["accept_terms"],
            )
        )
        from django.contrib.auth import get_user_model

        orm_user = get_user_model().objects.get(id=user.id)
        return build_auth_response(request, orm_user)


class LoginView(InjectedAPIView):
    """Entrada HTTP para ``AuthenticateUserUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"], request=LoginSerializer, responses=UserSerializer)
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        needs_captcha = captcha_required(request, data["login"])
        if needs_captcha and not verify_hcaptcha(data.get("hcaptcha_token", ""), request.META.get("REMOTE_ADDR", "")):
            return Response(
                {"message": "Resolva o CAPTCHA para continuar.", "details": {"captcha_required": True}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            user = self.resolve(AuthenticateUserUseCase).execute(
                AuthenticateUserInput(login=data["login"], password=data["password"])
            )
        except InvalidCredentialsError:
            register_failure(request, data["login"])
            raise InvalidCredentialsError(
                details={"captcha_required": captcha_required(request, data["login"])}
            )
        clear_failures(request, data["login"])
        from django.contrib.auth import get_user_model

        orm_user = get_user_model().objects.get(id=user.id)
        if orm_user.is_2fa_enabled:
            return Response({"requires_2fa": True, "challenge": make_login_challenge(orm_user.id)})
        return build_auth_response(request, orm_user)


class AuthCapabilitiesView(InjectedAPIView):
    """Informa os métodos de autenticação disponíveis e os vínculos sociais da sessão.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from django.conf import settings
        from allauth.socialaccount.models import SocialAccount

        connected = []
        if request.user.is_authenticated:
            connected = list(SocialAccount.objects.filter(user=request.user).values_list("provider", flat=True))

        return Response({
            "passkeys": True,
            "two_factor": True,
            "email_verification": True,
            "captcha": settings.HCAPTCHA_ENABLED,
            "hcaptcha_site_key": settings.HCAPTCHA_SITE_KEY,
            "google": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
            "discord": bool(settings.DISCORD_CLIENT_ID and settings.DISCORD_CLIENT_SECRET),
            "connected_providers": connected,
        })


class OAuthBeginView(InjectedAPIView):
    """Inicia a autenticação social e prepara o redirecionamento para o provedor.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OAuthBeginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        return Response({"authorization_url": begin_oauth(data["provider"], data["mode"], request.user)})


class OAuthCompleteView(InjectedAPIView):
    """Conclui a autenticação social e produz a sessão ou o desafio de segundo fator.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = OAuthCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user, linked = complete_oauth(data["provider"], data["code"], data["state"])
        if linked:
            return Response({"linked": True})
        if user.is_2fa_enabled:
            return Response({"requires_2fa": True, "challenge": make_login_challenge(user.id)})
        return build_auth_response(request, user)


class RefreshView(InjectedAPIView):
    """Renova os tokens JWT a partir do refresh token e atualiza os cookies da sessão.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Auth"])
    def post(self, request):
        raw = request.data.get("refresh") or request.COOKIES.get(get_refresh_cookie_name())
        if not raw:
            return Response(
                {"error_code": "AUTHENTICATION_REQUIRED", "message": "Refresh token ausente."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            refresh = RefreshToken(raw)
        except TokenError:
            return Response(
                {"error_code": "AUTHENTICATION_FAILED", "message": "Refresh token inválido."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        response = Response({"ok": True})
        return set_auth_cookies(request, response, refresh=refresh)


class LogoutView(InjectedAPIView):
    """Limpa os cookies de autenticação na resposta de encerramento de sessão.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        response = Response({"ok": True})
        return clear_auth_cookies(response)


class MeView(InjectedAPIView):
    """Entrada HTTP para ``GetCurrentUserUseCase``, ``UpdateProfileUseCase``.

    Implementa GET, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"], responses=UserSerializer)
    def get(self, request):
        user = self.resolve(GetCurrentUserUseCase).execute(GetCurrentUserInput(user_id=request.user.id))
        return Response(UserSerializer(user).data)

    @extend_schema(tags=["Perfil"], request=UpdateProfileSerializer, responses=UserSerializer)
    def patch(self, request):
        serializer = UpdateProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = self.resolve(UpdateProfileUseCase).execute(
            UpdateProfileInput(user_id=request.user.id, **serializer.validated_data)
        )
        return Response(UserSerializer(user).data)


class VerifyTwoFactorLoginView(InjectedAPIView):
    """Entrada HTTP para ``VerifyTwoFactorLoginUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        user = self.resolve(VerifyTwoFactorLoginUseCase).execute(
            VerifyTwoFactorLoginInput(challenge=request.data.get("challenge", ""), code=request.data.get("code", ""))
        )
        return build_auth_response(request, user)


class TwoFactorView(InjectedAPIView):
    """Entrada HTTP para ``SetupTwoFactorUseCase``, ``ConfirmTwoFactorUseCase``,
    ``DisableTwoFactorUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"])
    def post(self, request):
        action = request.data.get("action") or "setup"
        if action == "setup":
            return Response(self.resolve(SetupTwoFactorUseCase).execute(request.user.id))
        code = request.data.get("code", "")
        if action == "confirm":
            return Response(
                self.resolve(ConfirmTwoFactorUseCase).execute(ConfirmTwoFactorInput(user_id=request.user.id, code=code))
            )
        if action == "disable":
            return Response(
                self.resolve(DisableTwoFactorUseCase).execute(DisableTwoFactorInput(user_id=request.user.id, code=code))
            )
        from common.architecture.exceptions import ValidationDomainError

        raise ValidationDomainError("Ação 2FA inválida.")


class GamerProfileView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetGamerProfileUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"])
    def get(self, request):
        return Response(self.resolve(GetGamerProfileUseCase).execute(request.user.id))


class RequestEmailVerificationView(InjectedAPIView):
    """Entrada HTTP para ``RequestEmailVerificationUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(self.resolve(RequestEmailVerificationUseCase).execute(request.user.id))


class VerifyEmailView(InjectedAPIView):
    """Entrada HTTP para ``VerifyEmailUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(
            self.resolve(VerifyEmailUseCase).execute(VerifyEmailInput(token=request.data.get("token", "")))
        )


class RequestPasswordResetView(InjectedAPIView):
    """Entrada HTTP para ``RequestPasswordResetUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(
            self.resolve(RequestPasswordResetUseCase).execute(
                RequestPasswordResetInput(email=request.data.get("email", ""))
            )
        )


class ConfirmPasswordResetView(InjectedAPIView):
    """Entrada HTTP para ``ConfirmPasswordResetUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AnonRateThrottle]

    @extend_schema(tags=["Auth"])
    def post(self, request):
        return Response(
            self.resolve(ConfirmPasswordResetUseCase).execute(
                ConfirmPasswordResetInput(
                    token=request.data.get("token", ""),
                    password=request.data.get("password", ""),
                )
            )
        )


class ClaimRewardView(ItemCatalogAPIView):
    """Entrada HTTP para ``ClaimRewardUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Perfil"])
    def post(self, request, reward_id):
        return Response(
            self.resolve(ClaimRewardUseCase).execute(ClaimRewardInput(user_id=request.user.id, reward_id=reward_id))
        )
