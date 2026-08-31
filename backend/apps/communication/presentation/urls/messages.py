from django.urls import path

from apps.communication.presentation.views.friends import MessagesView

urlpatterns = [
    path("", MessagesView.as_view(), name="customer-messages"),
]
