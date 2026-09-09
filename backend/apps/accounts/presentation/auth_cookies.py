"""Helpers HTTP de cookies JWT — camada de presentation (usam UserSerializer)."""

from __future__ import annotations

from typing import Any, Literal

from django.conf import settings
from django.middleware.csrf import get_token
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.presentation.serializers import UserSerializer

__all__ = [
    "build_auth_response",
    "clear_auth_cookies",
    "get_access_cookie_name",
    "get_refresh_cookie_name",
    "set_auth_cookies",
]


def get_access_cookie_name() -> str:
    return settings.REST_AUTH.get("JWT_AUTH_COOKIE", "PDL-auth")


def get_refresh_cookie_name() -> str:
    return settings.REST_AUTH.get("JWT_AUTH_REFRESH_COOKIE", "PDL-refresh")


def _cookie_secure(request) -> bool:
    return bool(
        settings.REST_AUTH.get(
            "JWT_AUTH_SECURE",
            getattr(settings, "SESSION_COOKIE_SECURE", False) or request.is_secure(),
        )
    )


def _cookie_samesite() -> Literal["Lax", "None", "Strict", False] | None:
    value = settings.REST_AUTH.get("JWT_AUTH_SAMESITE", "Lax")
    if value in ("Lax", "None", "Strict", False, None):
        return value
    return "Lax"


def _cookie_kwargs(request, *, max_age: int) -> dict[str, Any]:
    return {
        "httponly": True,
        "secure": _cookie_secure(request),
        "samesite": _cookie_samesite(),
        "max_age": max_age,
        "path": "/",
    }


def set_auth_cookies(request, response: Response, *, refresh: RefreshToken) -> Response:
    access = str(refresh.access_token)
    cookie_age = int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds())
    response.set_cookie(
        get_access_cookie_name(),
        access,
        **_cookie_kwargs(request, max_age=cookie_age),
    )
    response.set_cookie(
        get_refresh_cookie_name(),
        str(refresh),
        **_cookie_kwargs(request, max_age=cookie_age),
    )
    get_token(request)
    return response


def clear_auth_cookies(response: Response) -> Response:
    samesite = _cookie_samesite()
    delete_samesite = samesite if isinstance(samesite, str) else "Lax"
    response.delete_cookie(get_access_cookie_name(), path="/", samesite=delete_samesite)
    response.delete_cookie(get_refresh_cookie_name(), path="/", samesite=delete_samesite)
    return response


def build_auth_response(request, user) -> Response:
    refresh = RefreshToken.for_user(user)
    response = Response(UserSerializer(user).data)
    return set_auth_cookies(request, response, refresh=refresh)
