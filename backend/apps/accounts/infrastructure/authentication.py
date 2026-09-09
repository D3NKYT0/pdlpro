from __future__ import annotations

from typing import Any, cast
from uuid import UUID

from django.http import HttpResponse
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError

from apps.accounts.domain.auth_session import IAuthSessionService
from apps.accounts.domain.repositories import IUserRepository
from apps.accounts.infrastructure.cookie_names import (
    get_access_cookie_name,
    get_refresh_cookie_name,
)

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def _csrf_failed_reason(request) -> str | None:
    def _noop(_request: Any) -> HttpResponse:
        return HttpResponse()

    check = CSRFCheck(_noop)
    check.process_request(request)
    result = check.process_view(request, cast(Any, None), (), {})
    if result is None:
        return None
    return str(getattr(result, "reason", result))


class CookieJWTAuthentication(JWTAuthentication):
    """Autenticação DRF que aceita JWT pelo header ou pelo cookie de acesso.

    Use na configuração de autenticação do DRF. O fluxo por cookie aplica a checagem CSRF para
    métodos de escrita; mantenha a obtenção e envio do token CSRF no cliente ao usar sessão por
    cookies.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        raw_token = None
        using_cookie = False

        if header is not None:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            raw_token = request.COOKIES.get(get_access_cookie_name())
            using_cookie = raw_token is not None

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
        except TokenError:
            if using_cookie:
                return None
            raise

        if using_cookie and request.method not in _SAFE_METHODS:
            reason = _csrf_failed_reason(request)
            if reason:
                raise exceptions.PermissionDenied(f"CSRF Failed: {reason}")

        user = self.get_user(validated_token)
        return user, validated_token


class AuthSessionService(IAuthSessionService):
    """Materializa o usuário ORM para a presentation montar cookies JWT."""

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def require_user(self, user_id: UUID):
        return self._users.require_orm_user(user_id)


__all__ = [
    "AuthSessionService",
    "CookieJWTAuthentication",
    "_csrf_failed_reason",
    "get_access_cookie_name",
    "get_refresh_cookie_name",
]
