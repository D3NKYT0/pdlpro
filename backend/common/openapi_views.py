from django.conf import settings
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


def docs_chrome_context():
    return {
        "docs_product": settings.PROJECT_TITLE,
        "docs_frontend_url": settings.FRONTEND_URL,
    }


class PdlSpectacularAPIView(SpectacularAPIView):
    """Publica o schema OpenAPI com acesso anônimo e limitação de requisições.

    Registre ``as_view()`` nas URLs de documentação. Usa os throttles de usuário e de visitante
    configurados no DRF.
    """

    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]


class PdlSpectacularSwaggerView(SpectacularSwaggerView):
    """Renderiza a interface Swagger pública com o contexto visual do painel.

    Configure a URL do schema em ``as_view(url_name=...)``. Acrescenta título do projeto e
    endereço do frontend ao contexto usado pelo template.
    """

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response.data.update(docs_chrome_context())
        return response


class PdlSpectacularRedocView(SpectacularRedocView):
    """Renderiza a interface ReDoc pública com o contexto visual do painel.

    Configure a URL do schema em ``as_view(url_name=...)``. Compartilha com o Swagger o título
    do projeto e o link de retorno ao frontend.
    """

    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response.data.update(docs_chrome_context())
        return response
