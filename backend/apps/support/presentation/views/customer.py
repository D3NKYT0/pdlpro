from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.communication.infrastructure.models import Notification
from apps.support.models import Ticket, TicketMessage
from apps.support.presentation.views.shared import serialize_ticket


ACTIVE_STATUSES = {Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS, Ticket.Status.WAITING_USER, Ticket.Status.WAITING_TEAM}


def error(message, code="INVALID_SUPPORT_REQUEST", http_status=status.HTTP_400_BAD_REQUEST):
    return Response({"message": message, "error_code": code, "details": {}}, status=http_status)


class CustomerTicketListCreateView(APIView):
    """Lista chamados do próprio usuário com contadores de estado e cria novos chamados com a
    mensagem inicial.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(tags=["Atendimento"])
    def get(self, request):
        tickets = Ticket.objects.filter(user=request.user).select_related("assigned_to")
        return Response({
            "results": [serialize_ticket(row) for row in tickets],
            "summary": {
                "active": tickets.filter(status__in=ACTIVE_STATUSES).count(),
                "waiting_user": tickets.filter(status=Ticket.Status.WAITING_USER).count(),
                "resolved": tickets.filter(status__in=[Ticket.Status.RESOLVED, Ticket.Status.CLOSED]).count(),
            },
        })

    @extend_schema(tags=["Atendimento"])
    @transaction.atomic
    def post(self, request):
        subject = str(request.data.get("subject", "")).strip()
        description = str(request.data.get("description", "")).strip()
        category = str(request.data.get("category", Ticket.Category.OTHER))
        priority = str(request.data.get("priority", Ticket.Priority.NORMAL))
        if len(subject) < 6:
            return error("Informe um assunto com pelo menos 6 caracteres.")
        if len(description) < 20:
            return error("Conte um pouco mais sobre o problema (mínimo de 20 caracteres).")
        if category not in Ticket.Category.values:
            return error("Categoria inválida.")
        if priority not in Ticket.Priority.values:
            return error("Prioridade inválida.")
        ticket = Ticket.objects.create(
            user=request.user,
            subject=subject[:160],
            description=description,
            category=category,
            priority=priority,
            context=request.data.get("context") if isinstance(request.data.get("context"), dict) else {},
        )
        TicketMessage.objects.create(ticket=ticket, author=request.user, body=description)
        return Response(serialize_ticket(ticket, detail=True), status=status.HTTP_201_CREATED)


class CustomerTicketDetailView(APIView):
    """Consulta e responde a um chamado do próprio usuário e permite encerrá-lo ou reabri-lo.

    Implementa GET, POST, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated].
    """

    permission_classes = [IsAuthenticated]

    def get_ticket(self, request, ticket_id):
        return Ticket.objects.filter(id=ticket_id, user=request.user).select_related("assigned_to", "user").first()

    @extend_schema(tags=["Atendimento"])
    def get(self, request, ticket_id):
        ticket = self.get_ticket(request, ticket_id)
        if not ticket:
            return error("Chamado não encontrado.", "TICKET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        return Response(serialize_ticket(ticket, detail=True))

    @extend_schema(tags=["Atendimento"])
    @transaction.atomic
    def post(self, request, ticket_id):
        ticket = self.get_ticket(request, ticket_id)
        if not ticket:
            return error("Chamado não encontrado.", "TICKET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        if ticket.status == Ticket.Status.CLOSED:
            return error("Reabra o chamado antes de enviar uma mensagem.")
        body = str(request.data.get("body", "")).strip()
        if len(body) < 2:
            return error("Escreva uma mensagem para a equipe.")
        TicketMessage.objects.create(ticket=ticket, author=request.user, body=body)
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
        return Response(serialize_ticket(ticket, detail=True), status=status.HTTP_201_CREATED)

    @extend_schema(tags=["Atendimento"])
    @transaction.atomic
    def patch(self, request, ticket_id):
        ticket = self.get_ticket(request, ticket_id)
        if not ticket:
            return error("Chamado não encontrado.", "TICKET_NOT_FOUND", status.HTTP_404_NOT_FOUND)
        action = request.data.get("action")
        now = timezone.now()
        if action == "close" and ticket.status in ACTIVE_STATUSES | {Ticket.Status.RESOLVED}:
            ticket.status = Ticket.Status.CLOSED
            ticket.closed_at = now
            event_body = "Chamado encerrado pelo jogador."
        elif action == "reopen" and ticket.status in {Ticket.Status.CLOSED, Ticket.Status.RESOLVED}:
            ticket.status = Ticket.Status.OPEN
            ticket.closed_at = None
            ticket.resolved_at = None
            event_body = "Chamado reaberto pelo jogador."
        else:
            return error("Esta ação não está disponível para o chamado.")
        ticket.last_activity_at = now
        ticket.save(update_fields=["status", "closed_at", "resolved_at", "last_activity_at", "updated_at"])
        TicketMessage.objects.create(ticket=ticket, author=request.user, body=event_body)
        return Response(serialize_ticket(ticket, detail=True))
