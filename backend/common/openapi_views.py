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


def docs_chrome_context():
    return {
        "docs_product": settings.PROJECT_TITLE,
        "docs_frontend_url": settings.FRONTEND_URL,
    }


class DocsChromeMixin:
    """Acrescenta o mesmo contexto visual às interfaces Swagger e ReDoc."""

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response.data.update(docs_chrome_context())
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
