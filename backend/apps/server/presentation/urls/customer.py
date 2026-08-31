from django.urls import path

from apps.server.presentation.views.customer import (
    ChangeNicknameView,
    ChangeSexView,
    CharactersView,
    ConfirmLinkByEmailView,
    LineageAccountsView,
    LinkGameAccountView,
    PurchaseSlotView,
    RegisterGameAccountView,
    RequestLinkByEmailView,
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
    path("characters/nickname/", ChangeNicknameView.as_view(), name="customer-nickname"),
    path("characters/sex/", ChangeSexView.as_view(), name="customer-sex"),
    path("characters/unstuck/", UnstuckView.as_view(), name="customer-unstuck"),
]
