from django.urls import include, path

urlpatterns = [
    path("auth/", include("core.routing.auth")),
    path("public/", include("core.routing.public")),
    path("shared/", include("core.routing.shared")),
    path("customer/", include("core.routing.customer")),
    path("staff/", include("core.routing.staff")),
    path("system/", include("core.routing.system")),
]
