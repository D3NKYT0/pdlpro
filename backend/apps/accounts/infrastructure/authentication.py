from __future__ import annotations

from typing import Any, Literal, cast

from django.conf import settings
from django.http import HttpResponse
from django.middleware.csrf import get_token
from rest_framework import exceptions
from rest_framework.authentication import CSRFCheck
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


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


def set_auth_cookies(request, response: Response, *, refresh: RefreshToken) -> Response:
    access = str(refresh.access_token)
    secure = _cookie_secure(request)
    samesite = _cookie_samesite()
    response.set_cookie(
        get_access_cookie_name(),
        access,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=int(settings.SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"].total_seconds()),
    )
    response.set_cookie(
        get_refresh_cookie_name(),
        str(refresh),
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
    )
    get_token(request)
    response.data = {
        **(response.data or {}),
        "access": access,
        "refresh": str(refresh),
    }
    return response


def clear_auth_cookies(response: Response) -> Response:
    response.delete_cookie(get_access_cookie_name())
    response.delete_cookie(get_refresh_cookie_name())
    return response


def build_auth_response(request, user) -> Response:
    refresh = RefreshToken.for_user(user)
    from apps.accounts.presentation.serializers import UserSerializer

    response = Response(UserSerializer(user).data)
    return set_auth_cookies(request, response, refresh=refresh)
