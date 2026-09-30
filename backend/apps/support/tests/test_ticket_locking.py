from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.db.backends.postgresql.base import DatabaseWrapper

from apps.support.infrastructure.repositories import DjangoTicketRepository
from apps.support.models import Ticket

User = get_user_model()


def test_locked_ticket_specifies_only_self_table_for_postgresql_safety():
    """Garante que o bloqueio do chamado especifica of=('self',), evitando o erro

    'FOR UPDATE cannot be applied to the nullable side of an outer join' no PostgreSQL
    devido ao relacionamento anulável assigned_to em select_related.
    """
    repo = DjangoTicketRepository()
    dummy_id = uuid4()
    locked_qs = repo._base_qs().select_for_update(of=("self",)).filter(id=dummy_id)

    assert locked_qs.query.select_for_update is True
    assert locked_qs.query.select_for_update_of == ("self",)

    # Simula o compilador do PostgreSQL para validar a resolução dos argumentos de bloqueio
    pg_conn = DatabaseWrapper({"ENGINE": "django.db.backends.postgresql"})
    compiler = locked_qs.query.get_compiler(using=pg_conn.alias, connection=pg_conn)
    compiler.setup_query()
    of_args = compiler.get_select_for_update_of_arguments()

    assert of_args == ['"support_ticket"'], (
        f"Esperado bloquear apenas 'support_ticket', mas obteve: {of_args}"
    )


@pytest.mark.django_db
def test_customer_reply_and_staff_actions_execute_with_locked_ticket():
    player = User.objects.create_user(
        username="player_lock", email="player_lock@pdl.dev"
    )
    staff = User.objects.create_user(
        username="staff_lock", email="staff_lock@pdl.dev", is_staff=True
    )
    ticket = Ticket.objects.create(
        user=player,
        assigned_to=None,
        subject="Dúvida com bloqueio",
        description="Chamado inicial sem atendente atribuído.",
    )

    repo = DjangoTicketRepository()

    # 1. Resposta do jogador (assigned_to é None -> outer join com auth_user seria nulo)
    updated = repo.add_customer_reply(ticket.id, player.id, "Mensagem do jogador")
    assert updated.status == Ticket.Status.IN_PROGRESS

    # 2. Resposta da equipe
    updated_staff = repo.add_staff_reply(
        ticket.id, staff.id, "Resposta da equipe", is_internal=False
    )
    assert updated_staff.status == Ticket.Status.WAITING_USER
    assert updated_staff.assigned_to == staff

    # 3. Atualização da equipe
    updated_ticket = repo.update_staff_ticket(
        ticket.id, staff.id, status=Ticket.Status.RESOLVED, update_status=True
    )
    assert updated_ticket.status == Ticket.Status.RESOLVED

    # 4. Ação do jogador (reabertura)
    reopened = repo.apply_customer_action(ticket.id, player.id, "reopen")
    assert reopened.status == Ticket.Status.OPEN
