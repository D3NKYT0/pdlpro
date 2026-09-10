import secrets

from django.middleware.csrf import get_token
from django.utils.translation import gettext as _
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.application.auth_capabilities import (
    AuthCapabilitiesInput,
    GetAuthCapabilitiesUseCase,
)
from apps.accounts.application.captcha import (
    captcha_required,
    clear_failures,
    register_failure,
    verify_hcaptcha,
)
from apps.accounts.application.email_use_cases import (
    ConfirmPasswordResetInput,
    ConfirmPasswordResetUseCase,
    RequestEmailVerificationUseCase,
    RequestPasswordResetInput,
    RequestPasswordResetUseCase,
    VerifyEmailInput,
    VerifyEmailUseCase,
)
from apps.accounts.application.oauth import (
    BeginOAuthInput,
    BeginOAuthUseCase,
    CompleteOAuthInput,
    CompleteOAuthUseCase,
)
from apps.accounts.application.progress_use_cases import (
    ClaimRewardInput,
    ClaimRewardUseCase,
    GetGamerProfileUseCase,
)
from apps.accounts.application.sessions import (
    ListSessionsInput,
    ListSessionsUseCase,
    RevokeOtherSessionsInput,
    RevokeOtherSessionsUseCase,
    RevokeRefreshInput,
    RevokeRefreshUseCase,
    RevokeSessionInput,
    RevokeSessionUseCase,
    RotateRefreshInput,
    RotateRefreshUseCase,
    refresh_jti,
)
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
from apps.accounts.application.use_cases import (
    AuthenticateUserInput,
    AuthenticateUserUseCase,
    CompleteCredentialsInput,
    CompleteCredentialsUseCase,
    GetCurrentUserInput,
    GetCurrentUserUseCase,
    RegisterUserInput,
    RegisterUserUseCase,
    UpdateProfileInput,
    UpdateProfileUseCase,
)
from apps.accounts.domain.auth_session import IAuthSessionService
from apps.accounts.domain.exceptions import (
    InvalidCredentialsError,
    SessionAuthenticationError,
)
from apps.accounts.presentation.auth_cookies import (
    build_auth_response,
    clear_auth_cookies,
    get_refresh_cookie_name,
    set_auth_cookies,
)
from apps.accounts.presentation.csrf import csrf_failed_reason
from apps.accounts.presentation.serializers import (
    AuthSessionSerializer,
    CompleteCredentialsSerializer,
    LoginSerializer,
    OAuthBeginSerializer,
    OAuthCompleteSerializer,
    RegisterSerializer,
    UpdateProfileSerializer,
    UserSerializer,
)
from apps.accounts.presentation.throttling import (
    LoginRateThrottle,
    RegisterRateThrottle,
)
from apps.server.presentation.item_metadata import ItemCatalogAPIView
from common.views import InjectedAPIView


class CsrfView(InjectedAPIView):
    """Disponibiliza o token CSRF necessário às requisições de escrita por cookie.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Auth"],
        summary="Obter token CSRF",
        description="Retorna o token CSRF necessário para requisições de escrita autenticadas por cookie.",
    )
    def get(self, request):
        return Response({"csrfToken": get_token(request)})


class RegisterView(InjectedAPIView):
    """Entrada HTTP para ``RegisterUserUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = (RegisterRateThrottle,)

    @extend_schema(
        tags=["Auth"],
        request=RegisterSerializer,
        responses=UserSerializer,
        summary="Registrar conta",
        description="Cria uma nova conta de usuário e inicia a sessão com cookies de autenticação.",
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        from django.conf import settings

        if settings.HCAPTCHA_ENABLED and not verify_hcaptcha(data.get("hcaptcha_token", ""), request.META.get("REMOTE_ADDR", "")):
            return Response(
                {"message": _("Resolva o CAPTCHA para criar sua conta."), "details": {"captcha_required": True}},
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
        return build_auth_response(request, self.resolve(IAuthSessionService).require_user(user.id))


class LoginView(InjectedAPIView):
    """Entrada HTTP para ``AuthenticateUserUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = (LoginRateThrottle,)

    @extend_schema(
        tags=["Auth"],
        request=LoginSerializer,
        responses=UserSerializer,
        summary="Entrar",
        description="Autentica com login e senha, podendo exigir CAPTCHA ou desafio de segundo fator.",
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        needs_captcha = captcha_required(request, data["login"])
        if needs_captcha and not verify_hcaptcha(data.get("hcaptcha_token", ""), request.META.get("REMOTE_ADDR", "")):
            return Response(
                {"message": _("Resolva o CAPTCHA para continuar."), "details": {"captcha_required": True}},
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
        if user.is_2fa_enabled:
            return Response({"requires_2fa": True, "challenge": make_login_challenge(user.id)})
        return build_auth_response(request, self.resolve(IAuthSessionService).require_user(user.id))


class AuthCapabilitiesView(InjectedAPIView):
    """Informa os métodos de autenticação disponíveis e os vínculos sociais da sessão.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        summary="Capacidades de autenticação",
        description="Informa flags de passkeys, 2FA, verificação de e-mail, CAPTCHA, provedores OAuth e vínculos sociais da sessão.",
    )
    def get(self, request):
        return Response(
            self.resolve(GetAuthCapabilitiesUseCase).execute(
                AuthCapabilitiesInput(
                    user_id=request.user.id if request.user.is_authenticated else None,
                    is_authenticated=request.user.is_authenticated,
                )
            )
        )


class OAuthBeginView(InjectedAPIView):
    """Inicia a autenticação social e prepara o redirecionamento para o provedor.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        request=OAuthBeginSerializer,
        summary="Iniciar OAuth",
        description="Gera a URL de autorização do provedor social para login ou vínculo de conta.",
    )
    def post(self, request):
        serializer = OAuthBeginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        browser_key = request.session.setdefault("oauth_browser", secrets.token_urlsafe(32))
        return Response(
            {
                "authorization_url": self.resolve(BeginOAuthUseCase).execute(
                    BeginOAuthInput(
                        provider=data["provider"],
                        mode=data["mode"],
                        user=request.user,
                        browser_key=browser_key,
                    )
                )
            }
        )


class OAuthCompleteView(InjectedAPIView):
    """Conclui a autenticação social e produz a sessão ou o desafio de segundo fator.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]

    @extend_schema(
        tags=["Auth"],
        request=OAuthCompleteSerializer,
        summary="Concluir OAuth",
        description="Troca o código do provedor por sessão autenticada, vínculo de conta ou desafio 2FA.",
    )
    def post(self, request):
        serializer = OAuthCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user, linked = self.resolve(CompleteOAuthUseCase).execute(
            CompleteOAuthInput(
                provider=data["provider"],
                code=data["code"],
                state=data["state"],
                browser_key=request.session.get("oauth_browser", ""),
                user=request.user,
            )
        )
        if linked:
            return Response({"linked": True})
        from apps.server.application.access import (
            assert_login_allowed_during_coming_soon,
        )
        from apps.server.domain.repositories import IIndexConfigRepository

        assert_login_allowed_during_coming_soon(
            user, self.resolve(IIndexConfigRepository)
        )
        if user.is_2fa_enabled:
            return Response({"requires_2fa": True, "challenge": make_login_challenge(user.id)})
        return build_auth_response(request, user)


class CompleteCredentialsView(InjectedAPIView):
    """Entrada HTTP para ``CompleteCredentialsUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        request=CompleteCredentialsSerializer,
        responses=UserSerializer,
        summary="Completar credenciais",
        description="Define username e senha para contas criadas via OAuth que ainda não possuem credenciais locais.",
    )
    def post(self, request):
        serializer = CompleteCredentialsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = self.resolve(CompleteCredentialsUseCase).execute(
            CompleteCredentialsInput(
                user_id=request.user.id,
                username=data["username"],
                password=data["password"],
                accept_terms=data["accept_terms"],
            )
        )
        return build_auth_response(request, self.resolve(IAuthSessionService).require_user(user.id))


class RefreshView(InjectedAPIView):
    """Renova os tokens JWT a partir do refresh token e atualiza os cookies da sessão.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [AllowAny].
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(
        tags=["Auth"],
        summary="Renovar sessão",
        description="Rotaciona o refresh token e atualiza os cookies JWT da sessão.",
    )
    def post(self, request):
        raw = request.data.get("refresh") or request.COOKIES.get(get_refresh_cookie_name())
        if not request.data.get("refresh") and raw and csrf_failed_reason(request):
            return Response({"message": _("Validação CSRF necessária.")}, status=status.HTTP_403_FORBIDDEN)
        if not raw:
            return Response(
                {"error_code": "AUTHENTICATION_REQUIRED", "message": _("Refresh token ausente.")},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        try:
            refresh = self.resolve(RotateRefreshUseCase).execute(RotateRefreshInput(raw=raw))
        except SessionAuthenticationError:
            return Response(
                {"error_code": "AUTHENTICATION_FAILED", "message": _("Refresh token inválido.")},
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

    @extend_schema(
        tags=["Auth"],
        summary="Sair",
        description="Revoga o refresh token e remove os cookies de autenticação da resposta.",
    )
    def post(self, request):
        self.resolve(RevokeRefreshUseCase).execute(
            RevokeRefreshInput(
                raw=request.data.get("refresh") or request.COOKIES.get(get_refresh_cookie_name()),
                user_id=request.user.id,
            )
        )
        response = Response({"ok": True})
        return clear_auth_cookies(response)


class SessionListView(InjectedAPIView):
    """Lista as sessões de refresh ativas do usuário autenticado.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        responses=AuthSessionSerializer(many=True),
        summary="Listar sessões",
        description="Retorna as sessões de refresh ativas, marcando a sessão do navegador atual.",
    )
    def get(self, request):
        current = refresh_jti(request.COOKIES.get(get_refresh_cookie_name()))
        rows = self.resolve(ListSessionsUseCase).execute(
            ListSessionsInput(user_id=request.user.id, current_jti=current)
        )
        return Response(AuthSessionSerializer(rows, many=True).data)


class SessionRevokeView(InjectedAPIView):
    """Revoga uma sessão específica do usuário autenticado.

    Implementa DELETE; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Se a sessão corrente for revogada, limpa os cookies de autenticação.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Revogar sessão",
        description="Encerra uma sessão ativa pelo identificador ``jti``. A sessão atual também limpa cookies.",
    )
    def delete(self, request, session_id):
        current = refresh_jti(request.COOKIES.get(get_refresh_cookie_name()))
        closed_current = self.resolve(RevokeSessionUseCase).execute(
            RevokeSessionInput(user_id=request.user.id, jti=session_id, current_jti=current)
        )
        response = Response({"ok": True, "current": closed_current})
        if closed_current:
            return clear_auth_cookies(response)
        return response


class SessionRevokeOthersView(InjectedAPIView):
    """Revoga todas as sessões ativas exceto a do navegador atual.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Revogar outras sessões",
        description="Encerra todas as sessões ativas preservando apenas a sessão corrente do navegador.",
    )
    def post(self, request):
        current = refresh_jti(request.COOKIES.get(get_refresh_cookie_name()))
        revoked = self.resolve(RevokeOtherSessionsUseCase).execute(
            RevokeOtherSessionsInput(user_id=request.user.id, current_jti=current)
        )
        return Response({"ok": True, "revoked": revoked})


class MeView(InjectedAPIView):
    """Entrada HTTP para ``GetCurrentUserUseCase``, ``UpdateProfileUseCase``.

    Implementa GET, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Perfil"],
        responses=UserSerializer,
        summary="Obter perfil",
        description="Retorna os dados do usuário autenticado na sessão atual.",
    )
    def get(self, request):
        user = self.resolve(GetCurrentUserUseCase).execute(GetCurrentUserInput(user_id=request.user.id))
        return Response(UserSerializer(user).data)

    @extend_schema(
        tags=["Perfil"],
        request=UpdateProfileSerializer,
        responses=UserSerializer,
        summary="Atualizar perfil",
        description="Atualiza campos do perfil do usuário autenticado e devolve o estado atualizado.",
    )
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

    @extend_schema(
        tags=["Auth"],
        summary="Verificar 2FA no login",
        description="Valida o código de segundo fator do desafio de login e inicia a sessão.",
    )
    def post(self, request):
        user = self.resolve(VerifyTwoFactorLoginUseCase).execute(
            VerifyTwoFactorLoginInput(challenge=request.data.get("challenge", ""), code=request.data.get("code", ""))
        )
        return build_auth_response(request, self.resolve(IAuthSessionService).require_user(user.id))


class TwoFactorView(InjectedAPIView):
    """Entrada HTTP para ``SetupTwoFactorUseCase``, ``ConfirmTwoFactorUseCase``,
    ``DisableTwoFactorUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Perfil"],
        summary="Gerenciar 2FA",
        description="Configura, confirma ou desativa a autenticação de dois fatores da conta.",
    )
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

        raise ValidationDomainError(_("Ação 2FA inválida."))


class GamerProfileView(ItemCatalogAPIView):
    """Entrada HTTP para ``GetGamerProfileUseCase``.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Perfil"],
        summary="Perfil gamer",
        description="Retorna progresso, recompensas e dados de jogo do usuário autenticado.",
    )
    def get(self, request):
        return Response(self.resolve(GetGamerProfileUseCase).execute(request.user.id))


class RequestEmailVerificationView(InjectedAPIView):
    """Entrada HTTP para ``RequestEmailVerificationUseCase``.

    Implementa POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Auth"],
        summary="Solicitar verificação de e-mail",
        description="Dispara o envio do e-mail com o link de verificação da conta autenticada.",
    )
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

    @extend_schema(
        tags=["Auth"],
        summary="Verificar e-mail",
        description="Confirma o endereço de e-mail a partir do token recebido na mensagem de verificação.",
    )
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

    @extend_schema(
        tags=["Auth"],
        summary="Solicitar redefinição de senha",
        description="Envia o e-mail com o token para redefinir a senha da conta associada ao endereço informado.",
    )
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

    @extend_schema(
        tags=["Auth"],
        summary="Confirmar redefinição de senha",
        description="Define a nova senha usando o token de redefinição recebido por e-mail.",
    )
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

    @extend_schema(
        tags=["Perfil"],
        summary="Resgatar recompensa",
        description="Resgata uma recompensa de progresso disponível para o usuário autenticado.",
    )
    def post(self, request, reward_id):
        return Response(
            self.resolve(ClaimRewardUseCase).execute(ClaimRewardInput(user_id=request.user.id, reward_id=reward_id))
        )
