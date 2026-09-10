from django.urls import path

from .views import ExtensionPingView

urlpatterns = [
    path("ping/", ExtensionPingView.as_view(), name="example-extension-ping"),
]
