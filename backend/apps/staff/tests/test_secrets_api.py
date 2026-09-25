"""API superadmin de status e ações de segredos."""

from __future__ import annotations

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.staff.infrastructure.models import SecretRotationJob


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def hosts(settings):
    settings.ALLOWED_HOSTS = ["painel.example.com", "testserver", "localhost"]
    return settings


@pytest.fixture
def superuser(db):
    return User.objects.create_superuser(
        username="ops",
        email="ops@pdl.dev",
        password="Secret123!",
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="gm",
        email="gm@pdl.dev",
        password="Secret123!",
        is_staff=True,
    )


@pytest.mark.django_db
def test_secrets_status_requires_superuser(api, staff_user, superuser, hosts):
    url = reverse("staff-secrets-status")
    api.force_authenticate(staff_user)
    assert api.get(url).status_code == 403
    api.force_authenticate(superuser)
    response = api.get(url)
    assert response.status_code == 200
    body = response.json()
    assert body["confirmation_domain"] == "painel.example.com"
    assert any(item["name"] == "SECRET_KEY" for item in body["secrets"])
    assert "fingerprint" in body["secrets"][0]


@pytest.mark.django_db
def test_revoke_sessions_action_applies_with_confirmation(api, superuser, hosts):
    api.force_authenticate(superuser)
    response = api.post(
        reverse("staff-secrets-actions"),
        {"kind": "revoke_all_sessions", "confirmation": "painel.example.com"},
        format="json",
    )
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["ok"] is True
    assert body["status"] == "applied"
    assert SecretRotationJob.objects.filter(kind="revoke_all_sessions", status="applied").exists()


@pytest.mark.django_db
def test_rotate_secret_without_runtime_flag_stays_pending(api, superuser, hosts, settings):
    settings.PDL_ALLOW_RUNTIME_SECRET_ROTATION = False
    api.force_authenticate(superuser)
    response = api.post(
        reverse("staff-secrets-actions"),
        {"kind": "rotate_secret_key", "confirmation": "painel.example.com", "apply_now": True},
        format="json",
    )
    assert response.status_code == 200, response.content
    body = response.json()
    assert body["status"] == "pending"
    assert SecretRotationJob.objects.filter(kind="rotate_secret_key", status="pending").exists()
