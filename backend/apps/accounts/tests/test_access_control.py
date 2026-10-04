"""Regressões de menor privilégio nas APIs e no Django Admin."""

import pytest
from django.contrib import admin
from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.auth.models import AnonymousUser, Group, Permission
from django.test import RequestFactory
from django.urls import reverse
from django.utils.translation import override
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate

from apps.accounts.domain.access import (
    CAPABILITIES,
    ROLE_CAPABILITIES,
    capability_permission,
    role_permissions,
)
from apps.accounts.forms import PDLUserChangeForm
from apps.accounts.infrastructure.authorization import RolePermissionBackend
from apps.accounts.infrastructure.models import User
from apps.accounts.presentation.serializers import UserSerializer
from apps.content.infrastructure.models import News
from apps.programs.models import Supporter
from apps.staff.presentation.views.config import StaffPanelSettingsView
from apps.support.admin import TicketMessageInline
from apps.support.models import Ticket, TicketMessage
from apps.wallet.infrastructure.models import Wallet
from common.di.bootstrap import DependencyInjection
from common.permissions import HasCapability

pytestmark = pytest.mark.django_db


def test_admin_entry_flag_does_not_grant_staff_api_access():
    user = User.objects.create_user(username="entry", email="entry@test.dev", is_staff=True)
    request = APIRequestFactory().get("/api/staff/settings/")
    request.container = DependencyInjection.root().create_scope()
    force_authenticate(request, user=user)
    assert StaffPanelSettingsView.as_view()(request).status_code == 403


def test_user_editor_cannot_promote_self(client):
    user = User.objects.create_user(username="editor", email="editor@test.dev", is_staff=True)
    user.user_permissions.add(Permission.objects.get(codename="change_user", content_type__app_label="accounts"))
    client.force_login(user)
    response = client.post(reverse("admin:accounts_user_change", args=[user.pk]), {
        "username": user.username, "email": user.email, "role": "admin",
        "is_active": "on", "is_staff": "on", "is_superuser": "on", "fichas": "0",
    })
    assert response.status_code == 403
    user.refresh_from_db()
    assert not user.is_superuser
    assert user.role == "player"


@pytest.mark.parametrize("role", ["player", "supporter", "promoter", "partner", "moderator", "support", "editor", "staff"])
def test_roles_do_not_grant_finance_or_settings(role):
    user = User.objects.create_user(username=role, email=f"{role}@test.dev", role=role, is_staff=True)
    assert not user.has_perm("accounts.finance_manage")
    assert not user.has_perm("accounts.settings_view")
    assert not user.has_perm("accounts.programs_manage")
    request = APIRequestFactory().get("/api/staff/settings/")
    force_authenticate(request, user=user)
    assert StaffPanelSettingsView.as_view()(request).status_code == 403


@pytest.mark.parametrize("role", list(ROLE_CAPABILITIES))
def test_role_template_matches_effective_capabilities(role):
    user = User.objects.create_user(username=role, email=f"{role}@test.dev", role=role)
    assert set(user.capabilities) == ROLE_CAPABILITIES[role]
    assert user.is_staff_member == bool(ROLE_CAPABILITIES[role])


def test_combined_roles_and_revocation_on_next_request():
    user = User.objects.create_user(username="combined", email="combined@test.dev", role="promoter")
    group, _ = Group.objects.get_or_create(name="PDL:editor")
    user.groups.add(group)
    assert user.roles == ["editor", "promoter"]
    assert user.has_perm("content.change_news")
    assert not user.has_perm("accounts.finance_manage")
    user.groups.remove(group)
    reloaded = User.objects.get(pk=user.pk)
    assert reloaded.roles == ["promoter"]
    assert not reloaded.has_perm("content.change_news")


def test_explicit_read_grant_does_not_grant_write_and_is_revocable():
    user = User.objects.create_user(username="reader", email="reader@test.dev")
    grant = Permission.objects.get(content_type__app_label="accounts", codename="settings_view")
    user.user_permissions.add(grant)
    factory = APIRequestFactory()
    request = factory.get("/api/staff/settings/")
    request.container = DependencyInjection.root().create_scope()
    force_authenticate(request, user=user)
    assert StaffPanelSettingsView.as_view()(request).status_code == 200
    request = factory.put("/api/staff/settings/", {}, format="json")
    force_authenticate(request, user=user)
    assert StaffPanelSettingsView.as_view()(request).status_code == 403
    user.user_permissions.clear()
    assert not User.objects.get(pk=user.pk).has_perm("accounts.settings_view")


def test_inactive_and_unknown_roles_have_no_capabilities():
    user = User.objects.create_user(username="inactive", email="inactive@test.dev", role="admin", is_active=False)
    assert user.capabilities == []
    assert not user.has_perm("content.change_news")
    assert role_permissions(["unknown"]) == set()
    with pytest.raises(ValueError):
        capability_permission("unknown.manage")


def test_permission_methods_fail_closed_and_preserve_head_options():
    user = User.objects.create_user(username="head", email="head@test.dev", role="editor")
    view = type("View", (), {"required_capabilities": {"GET": "content.view", "POST": "content.manage"}, "delete": lambda self: None})()
    permission = HasCapability()
    for method in ("GET", "HEAD", "OPTIONS", "POST"):
        request = RequestFactory().generic(method, "/")
        request.user = user
        assert permission.has_permission(request, view)
    request = RequestFactory().delete("/")
    request.user = user
    assert not permission.has_permission(request, view)
    assert not permission.has_permission(request, object())
    request.user = AnonymousUser()
    assert not permission.has_permission(request, view)
    user.is_active = False
    request.user = user
    assert not permission.has_permission(request, view)


def test_session_serializer_exposes_capabilities_and_combined_roles():
    user = User.objects.create_user(username="session", email="session@test.dev", role="moderator")
    data = UserSerializer(user).data
    assert data["roles"] == ["moderator"]
    assert set(data["capabilities"]) == {"moderation.view", "moderation.manage"}
    assert data["is_staff"] is False


def test_admin_entry_has_no_models_without_grants(client):
    user = User.objects.create_user(username="empty", email="empty@test.dev", is_staff=True)
    client.force_login(user)
    response = client.get(reverse("admin:index"))
    assert response.status_code == 200
    assert response.context["available_apps"] == []
    assert client.get(reverse("admin:content_news_changelist")).status_code == 403


def test_group_crud_and_bulk_delete_are_superuser_only(client):
    user = User.objects.create_user(username="groups", email="groups@test.dev", is_staff=True)
    user.user_permissions.add(*Permission.objects.filter(content_type__app_label="auth", codename__endswith="_group"))
    group = Group.objects.create(name="private")
    client.force_login(user)
    assert client.get(reverse("admin:auth_group_changelist")).status_code == 403
    assert client.post(reverse("admin:auth_group_add"), {"name": "PDL:admin"}).status_code == 403
    assert client.post(reverse("admin:auth_group_change", args=[group.pk]), {"name": "PDL:admin"}).status_code == 403
    assert client.post(reverse("admin:auth_group_changelist"), {"action": "delete_selected", "_selected_action": [group.pk]}).status_code == 403
    assert Group.objects.filter(pk=group.pk, name="private").exists()


def test_editor_can_edit_news_but_not_users_groups_or_wallets(client):
    user = User.objects.create_user(username="cms", email="cms@test.dev", is_staff=True, role="editor")
    news = News.objects.create(title="Antes", body="Conteúdo", slug="before")
    client.force_login(user)
    response = client.post(reverse("admin:content_news_change", args=[news.pk]), {
        "title": "Depois", "body": "Conteúdo", "slug": "before", "published_at_0": "2026-10-04",
        "published_at_1": "12:00:00", "is_published": "on",
    })
    assert response.status_code == 302
    news.refresh_from_db()
    assert news.title == "Depois"
    assert client.get(reverse("admin:accounts_user_changelist")).status_code == 403
    assert client.get(reverse("admin:auth_group_changelist")).status_code == 403
    assert client.get(reverse("admin:wallet_wallet_changelist")).status_code == 403


@pytest.mark.parametrize("role", ["partner", "editor", "support"])
def test_partner_admin_grant_is_scoped_and_cannot_change_commission(client, role):
    user = User.objects.create_user(username="partner", email="partner@test.dev", is_staff=True, role=role)
    other = User.objects.create_user(username="other", email="other@test.dev")
    own = Supporter.objects.create(user=user, name="Mine", channel_url="https://example.com/mine")
    foreign = Supporter.objects.create(user=other, name="Foreign", channel_url="https://example.com/foreign")
    user.user_permissions.add(*Permission.objects.filter(content_type__app_label="programs", codename__in=["view_supporter", "change_supporter"]))
    client.force_login(user)
    page = client.get(reverse("admin:programs_supporter_changelist"))
    assert page.status_code == 200
    assert list(page.context["cl"].queryset) == [own]
    assert client.get(reverse("admin:programs_supporter_change", args=[foreign.pk])).status_code == 302
    assert client.post(reverse("admin:programs_supporter_change", args=[own.pk]), {"commission_percent": "100", "status": "approved"}).status_code == 403
    own.refresh_from_db()
    assert own.commission_percent == 0
    assert own.status == "pending"


def test_superadmin_manages_roles_and_native_audit_records_change(client):
    user = User.objects.create_superuser(username="root", email="root@test.dev", password="password")
    group = Group.objects.get(name="PDL:editor")
    client.force_login(user)
    response = client.post(reverse("admin:auth_group_change", args=[group.pk]), {"name": group.name, "permissions": []})
    assert response.status_code == 302
    assert LogEntry.objects.filter(user=user, object_id=str(group.pk), action_flag=CHANGE).exists()
    assert set(user.capabilities) == CAPABILITIES
    assert user.roles == ["admin"]
    assert client.get(reverse("admin:accounts_user_add")).status_code == 200


def test_me_http_contract_and_profile_cannot_accept_privilege_fields():
    user = User.objects.create_user(username="profile", email="profile@test.dev", role="promoter")
    group = Group.objects.get(name="PDL:partner")
    user.groups.add(group)
    api = APIClient()
    api.force_authenticate(user)
    response = api.get("/api/v1/shared/me/")
    assert response.status_code == 200
    assert response.data["roles"] == ["partner", "promoter"]
    assert response.data["capabilities"] == []
    response = api.patch("/api/v1/shared/me/", {"display_name": "Novo", "role": "admin", "is_staff": True,
        "is_superuser": True, "groups": [], "capabilities": ["finance.manage"]}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.display_name == "Novo"
    assert user.role == "promoter"
    assert not user.is_staff and not user.is_superuser
    assert set(user.roles) == {"partner", "promoter"}
    assert not user.capabilities


def test_global_role_permissions_do_not_imply_object_permissions():
    user = User.objects.create_user(username="object", email="object@test.dev", role="editor")
    news = News.objects.create(title="News", body="Body", slug="object")
    assert user.has_perm("content.view_news")
    assert not user.has_perm("content.view_news", news)
    backend = RolePermissionBackend()
    assert backend.get_group_permissions(AnonymousUser()) == set()
    assert backend.get_group_permissions(user, news) == set()


def test_wallet_native_grants_do_not_allow_money_writes_or_other_owner(client):
    user = User.objects.create_user(username="wallet", email="wallet@test.dev", is_staff=True, role="partner")
    other = User.objects.create_user(username="foreign", email="foreign@test.dev")
    own = Wallet.objects.create(user=user, balance=5)
    foreign = Wallet.objects.create(user=other, balance=100)
    user.user_permissions.add(*Permission.objects.filter(content_type__app_label="wallet", codename__in=["view_wallet", "change_wallet"]))
    client.force_login(user)
    page = client.get(reverse("admin:wallet_wallet_changelist"))
    assert list(page.context["cl"].queryset) == [own]
    assert client.post(reverse("admin:wallet_wallet_change", args=[own.pk]), {"balance": "999"}).status_code == 403
    assert client.get(reverse("admin:wallet_wallet_change", args=[foreign.pk])).status_code == 302
    own.refresh_from_db()
    assert own.balance == 5


def test_personal_ticket_inlines_hide_internal_notes_and_reject_write():
    user = User.objects.create_user(username="inline", email="inline@test.dev", is_staff=True, role="partner")
    ticket = Ticket.objects.create(user=user, subject="Own", description="Need support")
    visible = TicketMessage.objects.create(ticket=ticket, author=user, body="Public")
    TicketMessage.objects.create(ticket=ticket, author=user, body="Secret", is_internal=True)
    user.user_permissions.add(*Permission.objects.filter(content_type__app_label="support", codename__endswith="_ticketmessage"))
    request = RequestFactory().get("/admin/")
    request.user = user
    inline = TicketMessageInline(Ticket, admin.site)
    assert list(inline.get_queryset(request)) == [visible]
    assert not inline.has_add_permission(request, ticket)
    assert not inline.has_change_permission(request, ticket)
    assert not inline.has_delete_permission(request, ticket)


@pytest.mark.parametrize("language, expected", [("en", "View support tickets"), ("es", "Consultar tickets de soporte")])
def test_capability_labels_are_translated_in_user_and_group_forms(language, expected):
    permission = Permission.objects.get(content_type__app_label="accounts", codename="support_view")
    root = User.objects.create_superuser(username="translator", email="translator@test.dev")
    request = RequestFactory().get("/admin/")
    request.user = root
    with override(language):
        form = PDLUserChangeForm()
        assert expected in form.fields["user_permissions"].label_from_instance(permission)
        form_class = admin.site._registry[Group].get_form(request, Group.objects.get(name="PDL:support"))
        assert expected in form_class.base_fields["permissions"].label_from_instance(permission)


def test_admin_entry_does_not_bypass_closed_game_registration():
    from apps.server.infrastructure.models import IndexConfig

    IndexConfig.objects.create(name="Closed", coming_soon=True, allow_l2_registration=False, is_active=True)
    user = User.objects.create_user(username="entryonly", email="entryonly@test.dev", is_staff=True)
    api = APIClient()
    api.force_authenticate(user)
    response = api.post("/api/v1/customer/server/accounts/register/", {"password": "GamePass1"}, format="json")
    assert response.status_code == 403
