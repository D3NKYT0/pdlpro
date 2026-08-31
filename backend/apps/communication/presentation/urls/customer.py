from django.urls import path

from apps.communication.presentation.views.customer import (
    MarkAllNotificationsReadView,
    MarkNotificationReadView,
    NotificationListView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="customer-notifications"),
    path("read-all/", MarkAllNotificationsReadView.as_view(), name="customer-notifications-read-all"),
    path("<uuid:notification_id>/read/", MarkNotificationReadView.as_view(), name="customer-notifications-read"),
]
