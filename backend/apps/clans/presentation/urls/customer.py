from django.urls import path

from apps.clans.presentation.views.customer import (
    ApplyToClanView,
    ClanApplicationsView,
    MyClanApplicationsView,
    MyClansView,
    ReviewClanApplicationView,
)

urlpatterns = [
    path("", MyClansView.as_view(), name="customer-clans-create"),
    path("applications/", MyClanApplicationsView.as_view(), name="customer-clans-my-applications"),
    path("<uuid:clan_id>/apply/", ApplyToClanView.as_view(), name="customer-clans-apply"),
    path("<uuid:clan_id>/applications/", ClanApplicationsView.as_view(), name="customer-clans-applications"),
    path(
        "applications/<uuid:application_id>/review/",
        ReviewClanApplicationView.as_view(),
        name="customer-clans-review",
    ),
]
