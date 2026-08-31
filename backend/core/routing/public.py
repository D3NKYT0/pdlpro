from django.urls import include, path

urlpatterns = [
    path("", include("apps.server.presentation.urls.public")),
    path("", include("apps.content.presentation.urls.public")),
]
