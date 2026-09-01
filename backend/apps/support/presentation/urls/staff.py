from django.urls import path

from apps.support.presentation.views.staff import StaffTicketDetailView, StaffTicketListView

urlpatterns = [
    path("", StaffTicketListView.as_view(), name="staff-support-list"),
    path("<uuid:ticket_id>/", StaffTicketDetailView.as_view(), name="staff-support-detail"),
]

