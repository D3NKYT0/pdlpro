"""Extensões drf-spectacular registradas pelo ``common`` (auth cookie JWT)."""

from __future__ import annotations

from drf_spectacular.extensions import OpenApiAuthenticationExtension
from drf_spectacular.plumbing import build_bearer_security_scheme_object


class CookieJWTAuthenticationScheme(OpenApiAuthenticationExtension):
    """Documenta ``CookieJWTAuthentication`` (Bearer e/ou cookie de acesso)."""

    target_class = "apps.accounts.infrastructure.authentication.CookieJWTAuthentication"
    name = "cookieJwtAuth"

    def get_security_definition(self, auto_schema):
        from rest_framework_simplejwt.settings import api_settings

        from apps.accounts.infrastructure.cookie_names import get_access_cookie_name

        # Mesmo token: header Authorization (Try it out) ou cookie da SPA.
        bearer = build_bearer_security_scheme_object(
            header_name=getattr(api_settings, "AUTH_HEADER_NAME", "HTTP_AUTHORIZATION"),
            token_prefix=api_settings.AUTH_HEADER_TYPES[0],
            bearer_format="JWT",
        )
        bearer["description"] = (
            "JWT de acesso via Authorization Bearer ou cookie "
            f"``{get_access_cookie_name()}`` (sessão da SPA com credentials)."
        )
        return bearer
