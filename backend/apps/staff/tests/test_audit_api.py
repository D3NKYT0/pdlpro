"""Testes do endpoint de listagem de audit logs staff."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.staff.infrastructure.models import AuditLog

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture()
def api():
    return APIClient()


@pytest.fixture()
def staff_user():
    return User.objects.create_user(
        username="staff-auditor",
        email="staff@example.com",
        password="pass",
        is_staff=True,
        role=User.Role.ADMIN,
    )


@pytest.fixture()
def regular_user():
    return User.objects.create_user(
        username="regular",
        email="regular@example.com",
        password="pass",
    )


@pytest.fixture()
def seed_audit(staff_user):
    """Cria registros de auditoria para os testes."""
    entries = []
    for i in range(5):
        entry = AuditLog.objects.create(
            actor=staff_user,
            action=f"staff-test-action:{i}",
            request_id=f"req-{i}",
            ip_address="203.0.113.10",
            method="POST" if i % 2 == 0 else "PUT",
            path=f"/api/v1/staff/test/{i}/",
            status_code=200 + i,
            target_type="test",
            target_id=str(i),
            payload={"outcome": "success"},
        )
        entries.append(entry)
    return entries


def test_audit_log_list_success(api, staff_user, seed_audit):
    """Staff pode listar audit logs com sucesso."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/audit-logs/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 5
    assert response.data["total_pages"] == 1
    assert len(response.data["results"]) == 5
    first = response.data["results"][0]
    assert "actor_username" in first
    assert "action" in first
    assert "created_at" in first


def test_audit_log_filter_by_action(api, staff_user, seed_audit):
    """Filtro por action retorna apenas registros correspondentes."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/audit-logs/?action=action:0")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] >= 1
    for entry in response.data["results"]:
        assert "action:0" in entry["action"]


def test_audit_log_filter_by_method(api, staff_user, seed_audit):
    """Filtro por method retorna apenas POST ou PUT."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/audit-logs/?method=POST")
    assert response.status_code == status.HTTP_200_OK
    for entry in response.data["results"]:
        assert entry["method"] == "POST"


def test_audit_log_search(api, staff_user, seed_audit):
    """Busca textual encontra registros pelo request_id."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/audit-logs/?search=req-2")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] >= 1


def test_audit_log_pagination(api, staff_user, seed_audit):
    """Paginação com page_size=2 retorna 3 páginas para 5 registros."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/audit-logs/?page_size=2&page=1")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 5
    assert response.data["total_pages"] == 3
    assert len(response.data["results"]) == 2


def test_audit_log_requires_staff(api, regular_user, seed_audit):
    """Usuário não-staff recebe 403."""
    api.force_authenticate(user=regular_user)
    response = api.get("/api/v1/staff/audit-logs/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_audit_log_empty_result(api, staff_user):
    """Sem registros retorna count=0 e lista vazia."""
    api.force_authenticate(user=staff_user)
    response = api.get("/api/v1/staff/audit-logs/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 0
    assert response.data["results"] == []
