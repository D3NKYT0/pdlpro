"""Atendimento: filtros, atribuição, auditoria interna e validações sem efeitos parciais."""
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.communication.infrastructure.models import Notification
from apps.support.models import Ticket, TicketMessage

pytestmark = pytest.mark.django_db


@pytest.fixture
def support():
    user = get_user_model().objects.create_user(username="player", email="player@test.dev")
    staff = get_user_model().objects.create_user(username="staff", email="staff@test.dev", is_staff=True)
    ticket = Ticket.objects.create(user=user, subject="Cobrança", description="Pagamento pendente", category="billing")
    client = APIClient()
    client.force_authenticate(staff)
    return client, ticket, staff


@pytest.mark.parametrize("filters", [{"q": "Cobrança"}, {"q": "player@test.dev"}, {"category": "billing"}, {"status": "open"}])
def test_staff_filters_queue(support, filters):
    client, ticket, _ = support
    response = client.get("/api/v1/staff/support/", filters)
    assert response.status_code == 200
    assert [row["id"] for row in response.data["results"]] == [str(ticket.id)]
    assert client.get("/api/v1/staff/support/", {"q": "missing"}).data["results"] == []


@pytest.mark.parametrize("method", ["get", "post", "patch"])
def test_missing_ticket_returns_404(support, method):
    client, _, _ = support
    assert getattr(client, method)(f"/api/v1/staff/support/{uuid4()}/", {}, format="json").status_code == 404


def test_internal_reply_is_private_and_does_not_notify_player(support):
    client, ticket, staff = support
    response = client.post(f"/api/v1/staff/support/{ticket.id}/", {"body": "Consultar logs internos", "is_internal": True}, format="json")
    assert response.status_code == 201
    ticket.refresh_from_db()
    assert ticket.status == "open"
    assert ticket.first_response_at is None
    assert ticket.assigned_to == staff
    assert not Notification.objects.exists()
    client.force_authenticate(ticket.user)
    assert client.get(f"/api/v1/customer/support/{ticket.id}/").data["messages"] == []


@pytest.mark.parametrize("status,field", [("resolved", "resolved_at"), ("closed", "closed_at")])
def test_status_update_records_timestamp_audit_and_notification(support, status, field):
    client, ticket, _ = support
    response = client.patch(f"/api/v1/staff/support/{ticket.id}/", {"status": status, "priority": "high", "assigned_to": "me"}, format="json")
    assert response.status_code == 200
    ticket.refresh_from_db()
    assert ticket.status == status
    assert getattr(ticket, field) is not None
    assert TicketMessage.objects.filter(ticket=ticket, is_internal=True).count() == 3
    assert Notification.objects.filter(user=ticket.user).count() == 1


@pytest.mark.parametrize("payload", [{"status": "bad"}, {"status": "closed", "priority": "bad"}, {"assigned_to": str(uuid4())}])
def test_invalid_update_does_not_persist_partial_changes(support, payload):
    client, ticket, _ = support
    response = client.patch(f"/api/v1/staff/support/{ticket.id}/", payload, format="json")
    assert response.status_code == 400
    ticket.refresh_from_db()
    assert ticket.status == "open"
    assert ticket.assigned_to is None
    assert not TicketMessage.objects.exists()
    assert not Notification.objects.exists()


def test_assign_and_unassign_staff(support):
    client, ticket, staff = support
    url = f"/api/v1/staff/support/{ticket.id}/"
    assert client.patch(url, {"assigned_to": str(staff.id)}, format="json").status_code == 200
    ticket.refresh_from_db()
    assert ticket.assigned_to == staff
    assert client.patch(url, {"assigned_to": None}, format="json").status_code == 200
    ticket.refresh_from_db()
    assert ticket.assigned_to is None


def test_regular_player_cannot_be_assigned(support):
    client, ticket, _ = support
    assert client.patch(f"/api/v1/staff/support/{ticket.id}/", {"assigned_to": str(ticket.user.id)}, format="json").status_code == 400
