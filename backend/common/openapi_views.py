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
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]


class PdlSpectacularSwaggerView(SpectacularSwaggerView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response.data.update(docs_chrome_context())
        return response


class PdlSpectacularRedocView(SpectacularRedocView):
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        response = super().get(request, *args, **kwargs)
        response.data.update(docs_chrome_context())
        return response
