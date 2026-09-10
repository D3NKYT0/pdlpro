from django.conf import settings
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.accounts.infrastructure.authentication import CookieJWTAuthentication


class PublicOrStaffDocsPermission(BasePermission):
    """Expõe a documentação publicamente somente quando a instalação permitir.

    Com ``OPENAPI_DOCS_PUBLIC`` desligado, exige uma conta autenticada da equipe. Isso mantém o
    schema e as duas interfaces sob a mesma política, inclusive quando acessadas por uma sessão
    do Django Admin.
    """

    def has_permission(self, request, view) -> bool:
        if settings.OPENAPI_DOCS_PUBLIC:
            return True
        user = getattr(request, "user", None)
        return bool(
            user
            and user.is_authenticated
            and (user.is_staff or getattr(user, "is_staff_member", False))
        )


def docs_chrome_context(request=None):
    from common.i18n import from_django_language
    from django.utils import translation

    language = None
    if request is not None:
        language = getattr(request, "pdl_language", None)
    if not language:
        language = from_django_language(translation.get_language())
    return {
        "docs_product": settings.PROJECT_TITLE,
        "docs_frontend_url": settings.FRONTEND_URL,
        "docs_language": language,
    }


def _schema_url_with_lang(schema_url: str, language: str) -> str:
    if not schema_url:
        return schema_url
    separator = "&" if "?" in schema_url else "?"
    return f"{schema_url}{separator}lang={language}"


class DocsChromeMixin:
    """Acrescenta o mesmo contexto visual às interfaces Swagger e ReDoc."""

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        chrome = docs_chrome_context(request)
        response.data.update(chrome)
        schema_url = response.data.get("schema_url")
        if schema_url:
            response.data["schema_url"] = _schema_url_with_lang(
                schema_url, chrome["docs_language"]
            )
        return response


class PdlSpectacularAPIView(SpectacularAPIView):
    """Publica o schema OpenAPI conforme a política da instalação e com rate limit.

    Registre ``as_view()`` nas URLs de documentação. Usa os throttles de usuário e de visitante
    configurados no DRF.
    """

    authentication_classes = (CookieJWTAuthentication, SessionAuthentication)
    permission_classes = (PublicOrStaffDocsPermission,)
    throttle_classes = (AnonRateThrottle, UserRateThrottle)


class PdlSpectacularSwaggerView(DocsChromeMixin, SpectacularSwaggerView):
    """Renderiza a interface Swagger conforme a política de acesso da instalação.

    Configure a URL do schema em ``as_view(url_name=...)``. Acrescenta título do projeto e
    endereço do frontend ao contexto usado pelo template.
    """

    authentication_classes = (CookieJWTAuthentication, SessionAuthentication)
    permission_classes = (PublicOrStaffDocsPermission,)


class PdlSpectacularRedocView(DocsChromeMixin, SpectacularRedocView):
    """Renderiza a interface ReDoc conforme a política de acesso da instalação.

    Configure a URL do schema em ``as_view(url_name=...)``. Compartilha com o Swagger o título
    do projeto e o link de retorno ao frontend.
    """

    authentication_classes = (CookieJWTAuthentication, SessionAuthentication)
    permission_classes = (PublicOrStaffDocsPermission,)
