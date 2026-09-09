from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.support.application.use_cases import (
    CreateTicketInput,
    CreateTicketUseCase,
    GetCustomerTicketInput,
    GetCustomerTicketUseCase,
    ListCustomerTicketsInput,
    ListCustomerTicketsUseCase,
    ReplyCustomerTicketInput,
    ReplyCustomerTicketUseCase,
    UpdateCustomerTicketInput,
    UpdateCustomerTicketUseCase,
)
from apps.support.domain.ticket import TicketCategory, TicketPriority
from common.views import InjectedAPIView


class CustomerTicketListCreateView(InjectedAPIView):
    """Lista chamados do próprio usuário com contadores de estado e cria novos chamados com a
    mensagem inicial.

    Implementa GET, POST; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Atendimento"],
        summary="Listar meus chamados",
        description="Lista os chamados do próprio usuário com contadores de estado.",
    )
    def get(self, request):
        result = self.resolve(ListCustomerTicketsUseCase).execute(
            ListCustomerTicketsInput(user_id=request.user.id)
        )
        return Response({
            "results": result.tickets,
            "summary": result.summary,
        })

    @extend_schema(
        tags=["Atendimento"],
        summary="Criar chamado",
        description="Cria um novo chamado do usuário autenticado com a mensagem inicial.",
    )
    def post(self, request):
        ticket = self.resolve(CreateTicketUseCase).execute(
            CreateTicketInput(
                user_id=request.user.id,
                subject=str(request.data.get("subject", "")),
                description=str(request.data.get("description", "")),
                category=str(request.data.get("category", TicketCategory.OTHER)),
                priority=str(request.data.get("priority", TicketPriority.NORMAL)),
                context=request.data.get("context") if isinstance(request.data.get("context"), dict) else {},
            )
        )
        return Response(ticket, status=status.HTTP_201_CREATED)


class CustomerTicketDetailView(InjectedAPIView):
    """Consulta e responde a um chamado do próprio usuário e permite encerrá-lo ou reabri-lo.

    Implementa GET, POST, PATCH; registre ``as_view()`` nas URLs do módulo. Controle de acesso
    declarado: [IsAuthenticated]. Resolve a aplicação no escopo da requisição antes de montar a
    resposta.
    """

    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Atendimento"],
        summary="Detalhe do chamado",
        description="Consulta o chamado do próprio usuário com mensagens e metadados.",
    )
    def get(self, request, ticket_id):
        ticket = self.resolve(GetCustomerTicketUseCase).execute(
            GetCustomerTicketInput(user_id=request.user.id, ticket_id=ticket_id)
        )
        return Response(ticket)

    @extend_schema(
        tags=["Atendimento"],
        summary="Responder chamado",
        description="Envia uma mensagem do jogador no chamado e notifica o atendente quando houver.",
    )
    def post(self, request, ticket_id):
        ticket = self.resolve(ReplyCustomerTicketUseCase).execute(
            ReplyCustomerTicketInput(
                user_id=request.user.id,
                ticket_id=ticket_id,
                body=str(request.data.get("body", "")),
            )
        )
        return Response(ticket, status=status.HTTP_201_CREATED)

    @extend_schema(
        tags=["Atendimento"],
        summary="Encerrar ou reabrir chamado",
        description="Permite ao jogador encerrar ou reabrir o próprio chamado conforme a ação informada.",
    )
    def patch(self, request, ticket_id):
        ticket = self.resolve(UpdateCustomerTicketUseCase).execute(
            UpdateCustomerTicketInput(
                user_id=request.user.id,
                ticket_id=ticket_id,
                action=request.data.get("action"),
            )
        )
        return Response(ticket)
