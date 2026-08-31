from django.urls import include, path

urlpatterns = [
    path("server/", include("apps.server.presentation.urls.customer")),
]
