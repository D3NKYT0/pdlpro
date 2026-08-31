from django.urls import path

from apps.shop.presentation.views.shared import ShopCartView, ShopCatalogView, ShopCheckoutView

urlpatterns = [
    path("catalog/", ShopCatalogView.as_view(), name="shared-shop-catalog"),
    path("cart/", ShopCartView.as_view(), name="shared-shop-cart"),
    path("checkout/", ShopCheckoutView.as_view(), name="shared-shop-checkout"),
]
