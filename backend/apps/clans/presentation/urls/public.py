from django.urls import path

from apps.clans.presentation.views.customer import PublicClanListView

urlpatterns = [
    path("clans/", PublicClanListView.as_view(), name="public-clans"),
]
