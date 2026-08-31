from django.urls import path

from apps.server.presentation.views.public import ServerStatusView

urlpatterns = [
    path("status/", ServerStatusView.as_view(), name="customer-server-status"),
]
