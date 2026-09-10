from django.utils.translation import gettext_lazy
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.support.application.use_cases import (
    GetStaffTicketInput,
    GetStaffTicketUseCase,
    ListStaffTicketsInput,
    ListStaffTicketsUseCase,
    ReplyStaffTicketInput,
    ReplyStaffTicketUseCase,
    UpdateStaffTicketInput,
    UpdateStaffTicketUseCase,
)
from common.permissions import IsStaffMember
from common.views import InjectedAPIView


class StaffTicketListView(InjectedAPIView):
    """Lista chamados para a equipe com filtros e indicadores de atendimento.

    Implementa GET; registre ``as_view()`` nas URLs do módulo. Controle de acesso declarado:
    [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff - Atendimento"],
        summary=gettext_lazy("Listar chamados (staff)"),
        description=gettext_lazy("Lista chamados para a equipe com filtros e indicadores de atendimento."),
    )
    def get(self, request):
        result = self.resolve(ListStaffTicketsUseCase).execute(
            ListStaffTicketsInput(
                status=request.query_params.get("status", ""),
                category=request.query_params.get("category", ""),
                query=request.query_params.get("q", "").strip(),
            )
        )
        return Response({
            "results": result.tickets,
            "summary": result.summary,
        })


class StaffTicketDetailView(InjectedAPIView):
    """Permite à equipe responder, atribuir responsáveis e atualizar o estado de um chamado.

    Implementa GET, POST, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated, IsStaffMember]. Resolve a aplicação no escopo da requisição
    antes de montar a resposta.
    """

    permission_classes = [IsAuthenticated, IsStaffMember]

    @extend_schema(
        tags=["Staff - Atendimento"],
        summary=gettext_lazy("Detalhe do chamado (staff)"),
        description=gettext_lazy("Consulta o chamado informado com mensagens e metadados administrativos."),
    )
    def get(self, request, ticket_id):
        ticket = self.resolve(GetStaffTicketUseCase).execute(GetStaffTicketInput(ticket_id=ticket_id))
        return Response(ticket)

    @extend_schema(
        tags=["Staff - Atendimento"],
        summary=gettext_lazy("Responder chamado (staff)"),
        description=gettext_lazy("Permite à equipe responder um chamado, inclusive com notas internas."),
    )
    def post(self, request, ticket_id):
        ticket = self.resolve(ReplyStaffTicketUseCase).execute(
            ReplyStaffTicketInput(
                ticket_id=ticket_id,
                actor_id=request.user.id,
                body=str(request.data.get("body", "")),
                is_internal=bool(request.data.get("is_internal", False)),
            )
        )
        return Response(ticket, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Staff - Atendimento"],
        summary=gettext_lazy("Atualizar chamado (staff)"),
        description=gettext_lazy("Permite à equipe atribuir responsáveis e atualizar o estado de um chamado."),
    )
    def patch(self, request, ticket_id):
        ticket = self.resolve(UpdateStaffTicketUseCase).execute(
            UpdateStaffTicketInput(
                ticket_id=ticket_id,
                actor_id=request.user.id,
                status=request.data.get("status"),
                update_status="status" in request.data,
                priority=request.data.get("priority"),
                update_priority="priority" in request.data,
                assigned_to=request.data.get("assigned_to"),
                update_assigned_to="assigned_to" in request.data,
            )
        )
        return Response(ticket)
