from django.urls import path

from apps.social.presentation.views.customer import PublicFeedView

urlpatterns = [
    path("feed/", PublicFeedView.as_view(), name="public-social-feed"),
]
