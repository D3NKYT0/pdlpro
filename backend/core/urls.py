from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

from common.openapi_views import (
    PdlSpectacularAPIView,
    PdlSpectacularRedocView,
    PdlSpectacularSwaggerView,
)
from core import views

urlpatterns = [
    path("", views.backend_index, name="backend_index"),
    path("admin/", admin.site.urls),
    path("api/v1/", include("core.api_urls")),
    path("api/schema/", PdlSpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/swagger-ui/",
        PdlSpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/docs/redoc/",
        PdlSpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler400 = "core.views.custom_400"
handler403 = "core.views.custom_403"
handler404 = "core.views.custom_404"
handler500 = "core.views.custom_500"
