from django.urls import include, path

urlpatterns = [
    path("", include("apps.accounts.presentation.urls.shared")),
    path("wallet/", include("apps.wallet.presentation.urls.shared")),
    path("shop/", include("apps.shop.presentation.urls.shared")),
    path("content/", include("apps.content.presentation.urls.shared")),
]
