"""API superadmin de status e ações de segredos."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.infrastructure.models import User
from apps.staff.application import secrets as secrets_module
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


@pytest.mark.django_db
def test_secrets_status_detects_redis_password(api, superuser, hosts, settings):
    api.force_authenticate(superuser)
    url = reverse("staff-secrets-status")

    # Sem senha de redis no test.py (memory://)
    r1 = api.get(url)
    assert r1.status_code == 200
    redis_item = next(s for s in r1.json()["secrets"] if s["name"] == "REDIS_PASSWORD")
    assert redis_item["present"] is False

    # Com REDIS_URL autenticada
    settings.REDIS_URL = "redis://:my_super_secret_redis_pw@redis:6379/0"
    r2 = api.get(url)
    assert r2.status_code == 200
    redis_item2 = next(s for s in r2.json()["secrets"] if s["name"] == "REDIS_PASSWORD")
    assert redis_item2["present"] is True
    assert redis_item2["fingerprint"] != ""
    assert redis_item2["level"] == "ok"

    # Ou com REDIS_PASSWORD direto em settings
    settings.REDIS_URL = "redis://redis:6379/0"
    settings.REDIS_PASSWORD = "another_redis_pw"
    r3 = api.get(url)
    assert r3.status_code == 200
    redis_item3 = next(s for s in r3.json()["secrets"] if s["name"] == "REDIS_PASSWORD")
    assert redis_item3["present"] is True


@pytest.mark.django_db
def test_secrets_status_clears_restart_required_if_process_booted_after_job(api, superuser, hosts):
    api.force_authenticate(superuser)
    url = reverse("staff-secrets-status")

    # Job aplicado no passado (antes do boot do processo atual)
    past_time = timezone.now() - timedelta(minutes=5)
    SecretRotationJob.objects.create(
        kind="rotate_secret_key",
        status="applied",
        restart_required=True,
        applied_at=past_time,
    )
    # Garante que PROCESS_BOOT_TIME é mais recente que o job
    secrets_module.PROCESS_BOOT_TIME = timezone.now()

    response = api.get(url)
    assert response.status_code == 200
    assert response.json()["restart_required"] is False

    # Se um novo job for aplicado após o boot do processo:
    SecretRotationJob.objects.create(
        kind="rotate_secret_key",
        status="applied",
        restart_required=True,
        applied_at=timezone.now() + timedelta(minutes=1),
    )
    response2 = api.get(url)
    assert response2.status_code == 200
    assert response2.json()["restart_required"] is True

