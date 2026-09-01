import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.communication.infrastructure.models import Notification
from apps.support.models import Ticket, TicketMessage

User = get_user_model()


@pytest.fixture
def api():
    return APIClient()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="supporter1", email="supporter1@pdl.dev", password="Secret123")


@pytest.fixture
def staff(db):
    return User.objects.create_user(
        username="staffhelp", email="staffhelp@pdl.dev", password="Secret123", role=User.Role.STAFF, is_staff=True
    )


@pytest.mark.django_db
def test_player_opens_and_only_sees_own_ticket(api, player):
    other = User.objects.create_user(username="otherhelp", email="otherhelp@pdl.dev", password="Secret123")
    Ticket.objects.create(user=other, subject="Chamado alheio", description="Não pode aparecer para o jogador autenticado")
    api.force_authenticate(player)

    created = api.post(
        "/api/v1/customer/support/",
        {
            "subject": "Pagamento ainda não creditado",
            "description": "Fiz um pagamento via PIX e o saldo ainda não apareceu na carteira.",
            "category": "billing",
            "priority": "high",
        },
        format="json",
    )
    assert created.status_code == 201, created.data
    assert created.data["protocol"].startswith("PDL-")
    assert created.data["status"] == "open"
    assert len(created.data["messages"]) == 1

    listed = api.get("/api/v1/customer/support/")
    assert listed.status_code == 200
    assert listed.data["summary"]["active"] == 1
    assert [row["subject"] for row in listed.data["results"]] == ["Pagamento ainda não creditado"]


@pytest.mark.django_db
def test_staff_reply_notifies_player_and_player_reply_advances_flow(api, player, staff):
    ticket = Ticket.objects.create(
        user=player,
        subject="Não consigo abrir o launcher",
        description="O launcher fecha logo depois de verificar os arquivos do cliente.",
        category=Ticket.Category.TECHNICAL,
    )
    TicketMessage.objects.create(ticket=ticket, author=player, body=ticket.description)

    api.force_authenticate(staff)
    response = api.post(
        f"/api/v1/staff/support/{ticket.id}/",
        {"body": "Envie o código exibido no arquivo de log, por favor."},
        format="json",
    )
    assert response.status_code == 201, response.data
    assert response.data["status"] == "waiting_user"
    assert response.data["assigned_to"] == staff.username
    assert Notification.objects.filter(user=player, kind="support").count() == 1

    api.force_authenticate(player)
    detail = api.get(f"/api/v1/customer/support/{ticket.id}/")
    assert detail.status_code == 200
    assert detail.data["messages"][-1]["is_staff_reply"] is True
    replied = api.post(
        f"/api/v1/customer/support/{ticket.id}/",
        {"body": "O código é PDL-LAUNCH-1042."},
        format="json",
    )
    assert replied.status_code == 201
    assert replied.data["status"] == "in_progress"


@pytest.mark.django_db
def test_internal_notes_and_foreign_tickets_are_hidden_from_player(api, player, staff):
    ticket = Ticket.objects.create(
        user=player,
        subject="Revisar denúncia enviada",
        description="Tenho evidências adicionais para esta denúncia e preciso encaminhar.",
        category=Ticket.Category.REPORT,
    )
    TicketMessage.objects.create(ticket=ticket, author=player, body=ticket.description)
    TicketMessage.objects.create(
        ticket=ticket, author=staff, body="Verificar logs antes de responder.", is_staff_reply=True, is_internal=True
    )
    stranger = User.objects.create_user(username="stranger", email="stranger@pdl.dev", password="Secret123")

    api.force_authenticate(player)
    own = api.get(f"/api/v1/customer/support/{ticket.id}/")
    assert own.status_code == 200
    assert len(own.data["messages"]) == 1

    api.force_authenticate(stranger)
    foreign = api.get(f"/api/v1/customer/support/{ticket.id}/")
    assert foreign.status_code == 404
    staff_queue = api.get("/api/v1/staff/support/")
    assert staff_queue.status_code == 403


@pytest.mark.django_db
def test_player_can_close_and_reopen_ticket(api, player):
    ticket = Ticket.objects.create(
        user=player,
        subject="Dúvida sobre personagem",
        description="Preciso confirmar uma informação do meu personagem antes de continuar.",
    )
    api.force_authenticate(player)
    closed = api.patch(f"/api/v1/customer/support/{ticket.id}/", {"action": "close"}, format="json")
    assert closed.status_code == 200
    assert closed.data["status"] == "closed"
    blocked_reply = api.post(f"/api/v1/customer/support/{ticket.id}/", {"body": "Ainda preciso de ajuda"}, format="json")
    assert blocked_reply.status_code == 400
    reopened = api.patch(f"/api/v1/customer/support/{ticket.id}/", {"action": "reopen"}, format="json")
    assert reopened.status_code == 200
    assert reopened.data["status"] == "open"
