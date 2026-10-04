"""Endpoints de representação com prova HttpOnly e proteção CSRF para o retorno."""

from uuid import UUID

from django.core import signing
from django.utils.translation import gettext_lazy as _
from drf_spectacular.utils import extend_schema
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.application.impersonation import ImpersonationService
from apps.accounts.domain.auth_session import IAuthSessionService
from apps.accounts.presentation.auth_cookies import (
    _cookie_kwargs,
    build_auth_response,
    get_refresh_cookie_name,
    set_auth_cookies,
)
from apps.accounts.presentation.csrf import csrf_failed_reason
from apps.accounts.presentation.serializers import UserSerializer
from common.architecture.exceptions import AuthorizationError, ValidationDomainError
from common.views import InjectedAPIView

COOKIE = "PDL-impersonation"
SALT = "accounts.impersonation"


def session_proof(request):
    try:
        return signing.loads(request.COOKIES.get(COOKIE, ""), salt=SALT, max_age=86400)
    except signing.BadSignature as exc:
        raise AuthorizationError() from exc


class SiteUsersView(InjectedAPIView):
    """Lista somente metadados de usuários, com busca e paginação de vinte registros."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"], summary=_("Listar usuários do site"))
    def get(self, request):
        try:
            page = int(request.query_params.get("page", "1"))
        except ValueError as exc:
            raise ValidationDomainError() from exc
        return Response(
            self.resolve(ImpersonationService).list_users(
                request.user.id, request.query_params.get("search", "").strip(), page
            )
        )


class ImpersonationStartView(InjectedAPIView):
    """Inicia a representação a partir da sessão real de um superadministrador."""

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Auth"], summary=_("Entrar como usuário"))
    def post(self, request, user_id: UUID):
        if request.auth and request.auth.get("impersonation"):
            raise AuthorizationError()
        try:
            original = RefreshToken(request.COOKIES.get(get_refresh_cookie_name(), ""))
            if str(original["user_id"]) != str(request.user.id):
                raise AuthorizationError()
        except TokenError as exc:
            raise AuthorizationError() from exc
        session_id = self.resolve(ImpersonationService).start(
            request.user.id, user_id, original["jti"]
        )
        user = self.resolve(IAuthSessionService).require_user(user_id)
        refresh = RefreshToken.for_user(user)
        refresh["impersonation"] = session_id
        response = set_auth_cookies(
            request, Response(UserSerializer(user).data), refresh=refresh
        )
        response.set_cookie(
            COOKIE,
            signing.dumps(session_id, salt=SALT),
            **_cookie_kwargs(request, max_age=86400),
        )
        return response


class ImpersonationStatusView(InjectedAPIView):
    """Retorna o autor original mesmo se o acesso do usuário representado expirou."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Auth"], summary=_("Consultar acesso como usuário"))
    def get(self, request):
        if not request.COOKIES.get(COOKIE):
            return Response({"impersonation": None})
        try:
            return Response(
                {
                    "impersonation": self.resolve(ImpersonationService).status(
                        session_proof(request)
                    )
                }
            )
        except AuthorizationError:
            return Response({"impersonation": None})


class ImpersonationStopView(InjectedAPIView):
    """Consome a prova de retorno uma vez e revoga todos os tokens da representação."""

    permission_classes = [AllowAny]
    authentication_classes = []

    @extend_schema(tags=["Auth"], summary=_("Voltar à conta original"))
    def post(self, request):
        if csrf_failed_reason(request):
            raise AuthorizationError()
        actor_id = self.resolve(ImpersonationService).finish(session_proof(request))
        response = build_auth_response(
            request, self.resolve(IAuthSessionService).require_user(actor_id)
        )
        response.delete_cookie(COOKIE, path="/")
        return response
