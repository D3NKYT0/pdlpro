from django.urls import path

from apps.communication.presentation.views.friends import FriendActionView, FriendsView

urlpatterns = [
    path("", FriendsView.as_view(), name="customer-friends"),
    path("<uuid:friendship_id>/<str:action>/", FriendActionView.as_view(), name="customer-friends-action"),
]
