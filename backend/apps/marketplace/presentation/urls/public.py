from django.urls import path

from apps.marketplace.presentation.views.customer import PublicMarketplaceView

urlpatterns = [
    path("marketplace/", PublicMarketplaceView.as_view(), name="public-marketplace"),
]
