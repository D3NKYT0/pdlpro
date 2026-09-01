from django.urls import path

from apps.support.presentation.views.customer import CustomerTicketDetailView, CustomerTicketListCreateView

urlpatterns = [
    path("", CustomerTicketListCreateView.as_view(), name="customer-support-list-create"),
    path("<uuid:ticket_id>/", CustomerTicketDetailView.as_view(), name="customer-support-detail"),
]

