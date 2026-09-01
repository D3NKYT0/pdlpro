from django.urls import path

from apps.server.presentation.views.customer import (
    ChangeNicknameView,
    ChangeSexView,
    CharacterDetailView,
    CharactersView,
    ConfirmLinkByEmailView,
    LineageAccountsView,
    LinkGameAccountView,
    PurchaseSlotView,
    RegisterGameAccountView,
    RequestLinkByEmailView,
    ServicePricesView,
    UnlinkGameAccountView,
    UnstuckView,
    UpdateGamePasswordView,
)
from apps.server.presentation.views.public import ServerStatusView

urlpatterns = [
    path("status/", ServerStatusView.as_view(), name="customer-server-status"),
    path("accounts/", LineageAccountsView.as_view(), name="customer-accounts"),
    path("accounts/register/", RegisterGameAccountView.as_view(), name="customer-accounts-register"),
    path("accounts/link/", LinkGameAccountView.as_view(), name="customer-accounts-link"),
    path("accounts/link-email/", RequestLinkByEmailView.as_view(), name="customer-accounts-link-email"),
    path("accounts/link-email/confirm/", ConfirmLinkByEmailView.as_view(), name="customer-accounts-link-email-confirm"),
    path("accounts/unlink/", UnlinkGameAccountView.as_view(), name="customer-accounts-unlink"),
    path("accounts/password/", UpdateGamePasswordView.as_view(), name="customer-accounts-password"),
    path("accounts/slots/", PurchaseSlotView.as_view(), name="customer-accounts-slots"),
    path("characters/", CharactersView.as_view(), name="customer-characters"),
    path("characters/<int:char_id>/", CharacterDetailView.as_view(), name="customer-character-detail"),
    path("characters/nickname/", ChangeNicknameView.as_view(), name="customer-nickname"),
    path("characters/sex/", ChangeSexView.as_view(), name="customer-sex"),
    path("characters/unstuck/", UnstuckView.as_view(), name="customer-unstuck"),
    path("services/", ServicePricesView.as_view(), name="customer-service-prices"),
]
