"""Testes do endpoint do dashboard de métricas staff."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture()
def api():
    return APIClient()


@pytest.fixture()
def staff_user():
    return User.objects.create_user(
        username="metrics-staff",
        email="metrics@example.com",
        password="pass",
        is_staff=True,
        role=User.Role.STAFF,
    )


@pytest.fixture()
def regular_user():
    return User.objects.create_user(
        username="metrics-regular",
        email="metreg@example.com",
        password="pass",
    )


def test_metrics_dashboard_success(api, staff_user):
    """Staff pode acessar o dashboard de métricas."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/metrics/dashboard/")
    assert response.status_code == status.HTTP_200_OK
    data = response.data
    assert "registrations_today" in data
    assert "logins_today" in data
    assert "revenue_today_brl" in data
    assert "active_users_24h" in data
    assert "total_users" in data
    assert "total_orders" in data
    assert "pending_orders" in data
    assert "failed_webhooks_24h" in data
    assert "audit_events_24h" in data
    assert "registrations_series" in data
    assert "revenue_series" in data
    assert len(data["registrations_series"]) == 7
    assert len(data["revenue_series"]) == 7
    assert "recent_audit" in data
    assert "top_actions" in data
    assert isinstance(data["registrations_today"], int)
    assert isinstance(data["total_users"], int)


def test_metrics_dashboard_requires_staff(api, regular_user):
    """Usuário não-staff recebe 403."""
    api.force_authenticate(user=regular_user)
    response = api.get("/api/v1/staff/metrics/dashboard/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_metrics_dashboard_no_cache(api, staff_user):
    """Resposta do dashboard tem Cache-Control: no-store."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/metrics/dashboard/")
    assert response.status_code == status.HTTP_200_OK
    assert response.get("Cache-Control") == "no-store"
