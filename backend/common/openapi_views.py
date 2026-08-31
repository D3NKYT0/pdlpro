from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class PdlSpectacularAPIView(SpectacularAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle, UserRateThrottle]


class PdlSpectacularSwaggerView(SpectacularSwaggerView):
    permission_classes = [AllowAny]


class PdlSpectacularRedocView(SpectacularRedocView):
    permission_classes = [AllowAny]
