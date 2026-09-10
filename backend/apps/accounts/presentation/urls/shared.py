from django.urls import path

from apps.accounts.presentation.views.auth import (
    AcceptTermsView,
    ClaimRewardView,
    GamerProfileView,
    MeView,
    TwoFactorView,
)

urlpatterns = [
    path("me/", MeView.as_view(), name="shared-me"),
    path("me/accept-terms/", AcceptTermsView.as_view(), name="shared-me-accept-terms"),
    path("me/2fa/", TwoFactorView.as_view(), name="shared-me-2fa"),
    path("me/progress/", GamerProfileView.as_view(), name="shared-me-progress"),
    path("me/rewards/<uuid:reward_id>/claim/", ClaimRewardView.as_view(), name="shared-me-claim-reward"),
]
