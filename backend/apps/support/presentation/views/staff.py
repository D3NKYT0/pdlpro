from django.contrib.auth import get_user_model
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.communication.infrastructure.models import Notification
from apps.support.models import Ticket, TicketMessage
from apps.support.presentation.views.customer import error
from apps.support.presentation.views.shared import serialize_ticket
from common.permissions import IsStaffMember

User = get_user_model()


class StaffTicketListView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(tags=["Staff - Atendimento"])
    def get(self, request):
        tickets = Ticket.objects.select_related("user", "assigned_to")
        status_filter = request.query_params.get("status", "")
        category = request.query_params.get("category", "")
        query = request.query_params.get("q", "").strip()
        if status_filter:
            tickets = tickets.filter(status=status_filter)
        if category:
            tickets = tickets.filter(category=category)
        if query:
            tickets = tickets.filter(
                Q(protocol__icontains=query)
                | Q(subject__icontains=query)
                | Q(user__username__icontains=query)
                | Q(user__email__icontains=query)
            )
        all_tickets = Ticket.objects.all()
        return Response({
            "results": [serialize_ticket(row, staff=True) for row in tickets[:200]],
            "summary": {
                "open": all_tickets.filter(status=Ticket.Status.OPEN).count(),
                "in_progress": all_tickets.filter(status=Ticket.Status.IN_PROGRESS).count(),
                "waiting_user": all_tickets.filter(status=Ticket.Status.WAITING_USER).count(),
                "unassigned": all_tickets.filter(assigned_to=None).exclude(status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]).count(),
                "sla_breached": sum(1 for row in all_tickets.exclude(status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]) if serialize_ticket(row)["sla_breached"]),
            },
        })


class StaffTicketDetailView(APIView):
    permission_classes = [IsAuthenticated, IsStaffMember]

    def get_ticket(self, ticket_id):
        return Ticket.objects.filter(id=ticket_id).select_related("user", "assigned_to").first()

    @extend_schema(tags=["Staff - Atendimento"])
    def get(self, request, ticket_id):
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return error("Chamado não encontrado.", "TICKET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return Response(serialize_ticket(ticket, detail=True, staff=True))

    @extend_schema(tags=["Staff - Atendimento"])
    @transaction.atomic
    def post(self, request, ticket_id):
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return error("Chamado não encontrado.", "TICKET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        body = str(request.data.get("body", "")).strip()
        if len(body) < 2:
            return error("Escreva uma resposta.")
        internal = bool(request.data.get("is_internal", False))
        TicketMessage.objects.create(
            ticket=ticket,
            author=request.user,
            body=body,
            is_staff_reply=True,
            is_internal=internal,
        )
        now = timezone.now()
        ticket.assigned_to = ticket.assigned_to or request.user
        if not internal:
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
        ticket.save(update_fields=["assigned_to", "status", "first_response_at", "last_activity_at", "updated_at"])
        return Response(serialize_ticket(ticket, detail=True, staff=True), status=status.HTTP_201_CREATED)

    @extend_schema(tags=["Staff - Atendimento"])
    @transaction.atomic
    def patch(self, request, ticket_id):
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return error("Chamado não encontrado.", "TICKET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        update_fields = ["updated_at", "last_activity_at"]
        audit_events = []
        if "status" in request.data:
            new_status = request.data.get("status")
            if new_status not in Ticket.Status.values:
                return error("Status inválido.")
            if ticket.status != new_status:
                audit_events.append(f"Status alterado de {ticket.get_status_display()} para {dict(Ticket.Status.choices)[new_status]}.")
            ticket.status = new_status
            update_fields.append("status")
            if new_status == Ticket.Status.RESOLVED:
                ticket.resolved_at = timezone.now()
                update_fields.append("resolved_at")
            elif new_status == Ticket.Status.CLOSED:
                ticket.closed_at = timezone.now()
                update_fields.append("closed_at")
        if "priority" in request.data:
            priority = request.data.get("priority")
            if priority not in Ticket.Priority.values:
                return error("Prioridade inválida.")
            if ticket.priority != priority:
                audit_events.append(f"Prioridade alterada de {ticket.get_priority_display()} para {dict(Ticket.Priority.choices)[priority]}.")
            ticket.priority = priority
            update_fields.append("priority")
        if "assigned_to" in request.data:
            assignee = request.data.get("assigned_to")
            if assignee == "me":
                ticket.assigned_to = request.user
            elif not assignee:
                ticket.assigned_to = None
            else:
                ticket.assigned_to = User.objects.filter(id=assignee).filter(
                    Q(is_staff=True) | Q(role__in=[User.Role.MODERATOR, User.Role.STAFF, User.Role.ADMIN])
                ).first()
                if not ticket.assigned_to:
                    return error("Atendente não encontrado.")
            update_fields.append("assigned_to")
            audit_events.append(f"Responsável definido como {ticket.assigned_to.get_full_name() if ticket.assigned_to else 'não atribuído'}.")
        ticket.last_activity_at = timezone.now()
        ticket.save(update_fields=list(set(update_fields)))
        for event in audit_events:
            TicketMessage.objects.create(
                ticket=ticket, author=request.user, body=event, is_staff_reply=True, is_internal=True
            )
        if "status" in request.data:
            Notification.objects.create(
                user=ticket.user,
                title=f"Chamado {ticket.protocol} atualizado",
                body=f"Novo status: {ticket.get_status_display()}.",
                kind="support",
                link=f"/painel/support?ticket={ticket.id}",
            )
        return Response(serialize_ticket(ticket, detail=True, staff=True))
