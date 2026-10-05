"""Exercita delegação real por HTTP, concorrência, preservação e rollback da auditoria."""

from unittest.mock import patch
from uuid import uuid4

import pytest
from django.contrib.admin.models import LogEntry
from django.contrib.auth.models import Group, Permission
from rest_framework.test import APIClient

from apps.accounts.application.access_management import AccessManagementService
from apps.accounts.infrastructure.models import User
from common.architecture.exceptions import AuthorizationError, ValidationDomainError
from common.di.bootstrap import DependencyInjection

pytestmark = pytest.mark.django_db
BASE = "/api/v1/auth/"


@pytest.fixture
def setup_access():
    boss = User.objects.create_superuser(username="boss", email="boss@test.dev", password="test")
    target = User.objects.create_user(username="target", email="target@test.dev")
    client = APIClient()
    client.force_authenticate(boss)
    return client, boss, target


def url(user):
    return BASE + f"site-users/{user.id}/access/"


def payload(client, target, **overrides):
    state = client.get(url(target)).data
    return {"role": "editor", "additional_roles": ["promoter"], "is_staff": True,
            "revision": state["revision"], **overrides}


def test_delegate_preserves_grants_and_audits_once(setup_access):
    client, boss, target = setup_access
    custom = Group.objects.create(name="Auditor")
    custom.permissions.add(Permission.objects.get(codename="financial_reports_view", content_type__app_label="accounts"))
    target.groups.add(custom)
    target.user_permissions.add(Permission.objects.get(codename="view_wallet", content_type__app_label="wallet"))
    body = payload(client, target)
    response = client.put(url(target), body, format="json")
    assert response.status_code == 200
    assert response.data["role"] == "editor"
    assert response.data["additional_roles"] == ["promoter"]
    assert response.data["is_staff"] is True
    assert "financial_reports.view" in response.data["extra_capabilities"]
    assert "content.manage" in response.data["capabilities"]
    assert response.data["other_groups"] == ["Auditor"]
    assert "wallet.view_wallet" in response.data["explicit_permissions"]
    assert LogEntry.objects.filter(user=boss, object_id=str(target.pk)).count() == 1
    # Uma repetição com revisão antiga não sobrescreve; estado idêntico atualizado é no-op.
    assert client.put(url(target), body, format="json").status_code == 409
    body["revision"] = response.data["revision"]
    assert client.put(url(target), body, format="json").status_code == 200
    assert LogEntry.objects.count() == 1
    revoked = client.put(url(target), payload(client, target, role="partner", additional_roles=[], is_staff=False), format="json")
    assert revoked.status_code == 200
    assert "content.manage" not in revoked.data["capabilities"]
    assert "financial_reports.view" in revoked.data["capabilities"]
    assert custom in target.groups.all()


@pytest.mark.parametrize("role", ["player", "admin", "support", "editor", "partner"])
def test_non_super_cannot_read_or_write_even_with_admin_entry(setup_access, role):
    client, _, target = setup_access
    body = payload(client, target)
    actor = User.objects.create_user(username=role, email=f"{role}@test.dev", role=role, is_staff=True)
    client.force_authenticate(actor)
    assert client.get(BASE + "access-roles/").status_code == 403
    assert client.get(url(target)).status_code == 403
    assert client.put(url(target), body, format="json").status_code == 403
    target.refresh_from_db()
    assert target.role == "player"


@pytest.mark.parametrize("change", [
    {"role": "unknown"},
    {"additional_roles": ["partner", "partner"]}, {"additional_roles": ["unknown"]},
    {"is_superuser": True}, {"password": "secret"}, {"user_permissions": []},
    {"revision": "bad"}, {"is_staff": "nonsense"},
])
def test_invalid_input_does_not_modify_access(setup_access, change):
    client, _, target = setup_access
    assert client.put(url(target), payload(client, target, **change), format="json").status_code == 400
    target.refresh_from_db()
    assert target.role == "player"
    assert not target.is_staff
    assert LogEntry.objects.count() == 0


def test_protected_accounts_missing_targets_anonymous_and_inactive(setup_access):
    client, boss, target = setup_access
    assert client.put(url(boss), payload(client, boss), format="json").status_code == 403
    other = User.objects.create_superuser(username="other", email="other@test.dev", password="test")
    assert client.put(url(other), payload(client, other), format="json").status_code == 403
    assert client.get(BASE + f"site-users/{uuid4()}/access/").status_code == 404
    client.force_authenticate(None)
    assert client.get(url(target)).status_code == 401
    boss.is_active = False
    boss.save()
    client.force_authenticate(boss)
    assert client.get(url(target)).status_code == 403


def test_concurrent_grant_change_conflicts(setup_access):
    client, _, target = setup_access
    body = payload(client, target)
    target.user_permissions.add(Permission.objects.get(codename="finance_view", content_type__app_label="accounts"))
    assert client.put(url(target), body, format="json").status_code == 409
    target.refresh_from_db()
    assert target.role == "player"


def test_audit_failure_rolls_back_role_and_groups(setup_access):
    client, _, target = setup_access
    body = payload(client, target)
    with patch("apps.accounts.infrastructure.access_management.LogEntry.objects.create", side_effect=RuntimeError("audit")):
        assert client.put(url(target), body, format="json").status_code == 500
    target.refresh_from_db()
    assert target.role == "player"
    assert not target.is_staff
    assert not target.groups.exists()


def test_catalog_and_list_show_current_roles(setup_access):
    client, _, target = setup_access
    assert client.get(BASE + "access-roles/").data["roles"]["partner"] == []
    client.put(url(target), payload(client, target), format="json")
    row = next(r for r in client.get(BASE + "site-users/").data["results"] if r["id"] == str(target.id))
    assert row["roles"] == ["editor", "promoter"]
    assert row["is_staff"] is True
    assert not row["can_impersonate"]


def test_reserved_group_exceptions_follow_role_in_preview_and_revocation(setup_access):
    client, _, target = setup_access
    group, _ = Group.objects.get_or_create(name="PDL:editor")
    group.permissions.add(Permission.objects.get(codename="finance_view", content_type__app_label="accounts"))
    assert "finance.view" in client.get(BASE + "access-roles/").data["additional_role_capabilities"]["editor"]
    response = client.put(url(target), payload(client, target, role="editor", additional_roles=["editor"]), format="json")
    assert "finance.view" in response.data["capabilities"]
    assert "finance.view" not in response.data["extra_capabilities"]
    response = client.put(url(target), payload(client, target, role="partner", additional_roles=[]), format="json")
    assert "finance.view" not in response.data["capabilities"]


@pytest.mark.parametrize("data", [[], "invalid", {"role": "editor"}])
def test_malformed_and_incomplete_payloads_return_validation_error(setup_access, data):
    client, _, target = setup_access
    assert client.put(url(target), data, format="json").status_code == 400


@pytest.mark.parametrize("language,label", [("en", "View role catalog"), ("es", "Consultar catálogo de roles")])
def test_new_backend_summaries_are_translated(language, label):
    from django.utils.translation import gettext, override
    with override(language):
        assert gettext("Consultar catálogo de papéis") == label


def test_application_rechecks_authority_and_validates_roles_without_http(setup_access):
    _, boss, target = setup_access
    service = DependencyInjection.root().create_scope().resolve(AccessManagementService)
    with pytest.raises(AuthorizationError):
        service.get(target.id, target.id)
    with pytest.raises(AuthorizationError):
        service.get(uuid4(), target.id)
    for role, groups in [("unknown", []), ("player", ["unknown"]), ("player", ["editor", "editor"])]:
        with pytest.raises(ValidationDomainError):
            service.update(boss.id, target.id, role, groups, False, "a" * 64)


def test_impersonation_proof_cannot_be_used_to_delegate_even_with_super_flag(setup_access):
    client, boss, target = setup_access
    body = payload(client, target)
    client.force_authenticate(boss, token={"impersonation": "session"})
    assert client.get(BASE + "access-roles/").status_code == 403
    assert client.get(url(target)).status_code == 403
    assert client.put(url(target), body, format="json").status_code == 403
