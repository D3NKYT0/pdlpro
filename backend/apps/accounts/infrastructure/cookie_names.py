from __future__ import annotations

from django.conf import settings


def get_access_cookie_name() -> str:
    return settings.REST_AUTH.get("JWT_AUTH_COOKIE", "PDL-auth")


def get_refresh_cookie_name() -> str:
    return settings.REST_AUTH.get("JWT_AUTH_REFRESH_COOKIE", "PDL-refresh")
