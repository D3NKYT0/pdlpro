from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone

from apps.communication.infrastructure.models import Notification
from apps.support.domain.repositories import ITicketRepository
from apps.support.models import Ticket, TicketMessage

User = get_user_model()

ACTIVE_STATUSES = {
    Ticket.Status.OPEN,
    Ticket.Status.IN_PROGRESS,
    Ticket.Status.WAITING_USER,
    Ticket.Status.WAITING_TEAM,
}

SLA_HOURS = {"low": 72, "normal": 48, "high": 24, "urgent": 8}


def _sla_breached(ticket: Ticket) -> bool:
    due_at = ticket.created_at + timedelta(hours=SLA_HOURS.get(ticket.priority, 48))
    return timezone.now() > due_at and ticket.status not in {
        Ticket.Status.RESOLVED,
        Ticket.Status.CLOSED,
    }


class DjangoTicketRepository(ITicketRepository):
    """Adaptador Django de ``ITicketRepository`` para chamados, mensagens e notificações.

    Concentra consultas e escritas ORM da porta. Prefira resolver a interface pelo container; ao
    combinar alterações em uma operação de negócio, o chamador deve delimitar a transação com
    UnitOfWork. Respostas HTTP e notificações de atendimento são efeitos desta camada.
    """

    def _base_qs(self):
        return Ticket.objects.select_related("assigned_to", "user")

    def list_for_user(self, user_id: UUID) -> list[Any]:
        return list(self._base_qs().filter(user__id=user_id))

    def summarize_for_user(self, user_id: UUID) -> dict[str, int]:
        tickets = Ticket.objects.filter(user__id=user_id)
        return {
            "active": tickets.filter(status__in=ACTIVE_STATUSES).count(),
            "waiting_user": tickets.filter(status=Ticket.Status.WAITING_USER).count(),
            "resolved": tickets.filter(
                status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]
            ).count(),
        }

    def create(
        self,
        user_id: UUID,
        *,
        subject: str,
        description: str,
        category: str,
        priority: str,
        context: dict,
    ) -> Any:
        user = User.objects.get(id=user_id)
        ticket = Ticket.objects.create(
            user=user,
            subject=subject,
            description=description,
            category=category,
            priority=priority,
            context=context,
        )
        TicketMessage.objects.create(ticket=ticket, author=user, body=description)
        return self._base_qs().get(id=ticket.id)

    def get_for_user(self, ticket_id: UUID, user_id: UUID) -> Any | None:
        return self._base_qs().filter(id=ticket_id, user__id=user_id).first()

    def get_by_id(self, ticket_id: UUID) -> Any | None:
        return self._base_qs().filter(id=ticket_id).first()

    def add_customer_reply(self, ticket_id: UUID, author_id: UUID, body: str) -> Any:
        ticket = self._base_qs().select_for_update().get(id=ticket_id)
        author = User.objects.get(id=author_id)
        TicketMessage.objects.create(ticket=ticket, author=author, body=body)
        ticket.status = Ticket.Status.IN_PROGRESS
        ticket.last_activity_at = timezone.now()
        ticket.save(update_fields=["status", "last_activity_at", "updated_at"])
        if ticket.assigned_to:
            Notification.objects.create(
                user=ticket.assigned_to,
                title=f"Jogador respondeu {ticket.protocol}",
                body=body[:180],
                kind="support",
                link=f"/painel/admin/atendimento?ticket={ticket.id}",
            )
        return ticket

    def apply_customer_action(self, ticket_id: UUID, author_id: UUID, action: str) -> Any:
        ticket = self._base_qs().select_for_update().get(id=ticket_id)
        author = User.objects.get(id=author_id)
        now = timezone.now()
        if action == "close":
            ticket.status = Ticket.Status.CLOSED
            ticket.closed_at = now
            event_body = "Chamado encerrado pelo jogador."
        else:
            ticket.status = Ticket.Status.OPEN
            ticket.closed_at = None
            ticket.resolved_at = None
            event_body = "Chamado reaberto pelo jogador."
        ticket.last_activity_at = now
        ticket.save(update_fields=["status", "closed_at", "resolved_at", "last_activity_at", "updated_at"])
        TicketMessage.objects.create(ticket=ticket, author=author, body=event_body)
        return ticket

    def list_for_staff(
        self,
        *,
        status: str = "",
        category: str = "",
        query: str = "",
        limit: int = 200,
    ) -> list[Any]:
        tickets = self._base_qs()
        if status:
            tickets = tickets.filter(status=status)
        if category:
            tickets = tickets.filter(category=category)
        if query:
            tickets = tickets.filter(
                Q(protocol__icontains=query)
                | Q(subject__icontains=query)
                | Q(user__username__icontains=query)
                | Q(user__email__icontains=query)
            )
        return list(tickets[:limit])

    def summarize_for_staff(self) -> dict[str, int]:
        all_tickets = Ticket.objects.all()
        return {
            "open": all_tickets.filter(status=Ticket.Status.OPEN).count(),
            "in_progress": all_tickets.filter(status=Ticket.Status.IN_PROGRESS).count(),
            "waiting_user": all_tickets.filter(status=Ticket.Status.WAITING_USER).count(),
            "unassigned": all_tickets.filter(assigned_to=None)
            .exclude(status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED])
            .count(),
            "sla_breached": sum(
                1
                for row in all_tickets.exclude(
                    status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]
                )
                if _sla_breached(row)
            ),
        }

    def add_staff_reply(
        self,
        ticket_id: UUID,
        author_id: UUID,
        body: str,
        *,
        is_internal: bool,
    ) -> Any:
        ticket = self._base_qs().select_for_update().get(id=ticket_id)
        author = User.objects.get(id=author_id)
        TicketMessage.objects.create(
            ticket=ticket,
            author=author,
            body=body,
            is_staff_reply=True,
            is_internal=is_internal,
        )
        now = timezone.now()
        ticket.assigned_to = ticket.assigned_to or author
        if not is_internal:
            ticket.status = Ticket.Status.WAITING_USER
            ticket.first_response_at = ticket.first_response_at or now
            Notification.objects.create(
                user=ticket.user,
                title=f"Nova resposta em {ticket.protocol}",
                body=body[:180],
                kind="support",
                link=f"/painel/support?ticket={ticket.id}",
            )
        ticket.last_activity_at = now
        ticket.save(
            update_fields=["assigned_to", "status", "first_response_at", "last_activity_at", "updated_at"]
        )
        return ticket

    def resolve_staff_assignee(self, assignee: Any, actor_id: UUID) -> Any | None:
        if assignee == "me":
            return User.objects.filter(id=actor_id).first()
        return (
            User.objects.filter(id=assignee)
            .filter(Q(is_staff=True) | Q(role__in=[User.Role.MODERATOR, User.Role.STAFF, User.Role.ADMIN]))
            .first()
        )

    def update_staff_ticket(
        self,
        ticket_id: UUID,
        actor_id: UUID,
        *,
        status: str | None = None,
        update_status: bool = False,
        priority: str | None = None,
        update_priority: bool = False,
        assignee: Any = None,
        update_assignee: bool = False,
    ) -> Any:
        ticket = self._base_qs().select_for_update().get(id=ticket_id)
        actor = User.objects.get(id=actor_id)
        update_fields = ["updated_at", "last_activity_at"]
        audit_events: list[str] = []

        if update_status:
            new_status = status
            if ticket.status != new_status:
                audit_events.append(
                    f"Status alterado de {ticket.get_status_display()} para {dict(Ticket.Status.choices)[new_status]}."
                )
            ticket.status = new_status
            update_fields.append("status")
            if new_status == Ticket.Status.RESOLVED:
                ticket.resolved_at = timezone.now()
                update_fields.append("resolved_at")
            elif new_status == Ticket.Status.CLOSED:
                ticket.closed_at = timezone.now()
                update_fields.append("closed_at")
            else:
                ticket.resolved_at = None
                ticket.closed_at = None
                update_fields.extend(["resolved_at", "closed_at"])

        if update_priority:
            if ticket.priority != priority:
                audit_events.append(
                    f"Prioridade alterada de {ticket.get_priority_display()} para {dict(Ticket.Priority.choices)[priority]}."
                )
            ticket.priority = priority
            update_fields.append("priority")

        if update_assignee:
            ticket.assigned_to = assignee
            update_fields.append("assigned_to")
            audit_events.append(
                f"Responsável definido como {ticket.assigned_to.get_full_name() if ticket.assigned_to else 'não atribuído'}."
            )

        ticket.last_activity_at = timezone.now()
        ticket.save(update_fields=list(set(update_fields)))
        for event in audit_events:
            TicketMessage.objects.create(
                ticket=ticket,
                author=actor,
                body=event,
                is_staff_reply=True,
                is_internal=True,
            )
        if update_status:
            Notification.objects.create(
                user=ticket.user,
                title=f"Chamado {ticket.protocol} atualizado",
                body=f"Novo status: {ticket.get_status_display()}.",
                kind="support",
                link=f"/painel/support?ticket={ticket.id}",
            )
        return ticket
