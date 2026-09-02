from django.urls import path

from .views import (
    RequestPayoutView,
    ResourceView,
    RoadmapView,
    StaffPayoutView,
    StaffResourceView,
    StaffRoadmapView,
    StaffSupporterView,
    SupporterView,
)

urlpatterns = [
    path("public/resources/", ResourceView.as_view()),
    path("public/roadmap/", RoadmapView.as_view()),
    path("public/roadmap/<uuid:entry_id>/", RoadmapView.as_view()),
    path("customer/supporters/", SupporterView.as_view()),
    path("customer/supporters/payout/", RequestPayoutView.as_view()),
    path("staff/supporters/", StaffSupporterView.as_view()),
    path("staff/supporters/<uuid:entry_id>/", StaffSupporterView.as_view()),
    path("staff/supporter-payouts/<uuid:entry_id>/", StaffPayoutView.as_view()),
    path("staff/roadmap/", StaffRoadmapView.as_view()),
    path("staff/roadmap/<uuid:entry_id>/", StaffRoadmapView.as_view()),
    path("staff/resources/", StaffResourceView.as_view()),
    path("staff/resources/<uuid:entry_id>/", StaffResourceView.as_view()),
]
