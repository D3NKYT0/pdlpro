from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from apps.support.domain.exceptions import InvalidTicketActionError, TicketNotFoundError
from apps.support.domain.repositories import ITicketRepository
from apps.support.domain.ticket import TicketCategory, TicketPriority, TicketStatus
from common.architecture.base import UnitOfWork, UseCase

ACTIVE_STATUSES = {
    TicketStatus.OPEN,
    TicketStatus.IN_PROGRESS,
    TicketStatus.WAITING_USER,
    TicketStatus.WAITING_TEAM,
}

CLOSED_STATUSES = {TicketStatus.CLOSED, TicketStatus.RESOLVED}


@dataclass(frozen=True, slots=True)
class ListCustomerTicketsInput:
    """Dados de entrada de ``ListCustomerTicketsUseCase.execute``."""

    user_id: UUID


@dataclass(frozen=True, slots=True)
class CustomerTicketListResult:
    """Lista de chamados do jogador com contadores de estado."""

    tickets: list[dict]
    summary: dict[str, int]


class ListCustomerTicketsUseCase(UseCase[ListCustomerTicketsInput, CustomerTicketListResult]):
    """Lista chamados do próprio usuário com contadores de estado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListCustomerTicketsInput``.
    """

    def __init__(self, tickets: ITicketRepository) -> None:
        self._tickets = tickets

    def execute(self, data: ListCustomerTicketsInput) -> CustomerTicketListResult:
        return CustomerTicketListResult(
            tickets=[
                self._tickets.dump_ticket(row) for row in self._tickets.list_for_user(data.user_id)
            ],
            summary=self._tickets.summarize_for_user(data.user_id),
        )


@dataclass(frozen=True, slots=True)
class CreateTicketInput:
    """Dados de entrada de ``CreateTicketUseCase.execute``."""

    user_id: UUID
    subject: str
    description: str
    category: str
    priority: str
    context: dict


class CreateTicketUseCase(UseCase[CreateTicketInput, dict]):
    """Cria um chamado com a mensagem inicial do jogador.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreateTicketInput``.
    """

    def __init__(self, tickets: ITicketRepository, unit_of_work: UnitOfWork) -> None:
        self._tickets = tickets
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateTicketInput) -> dict:
        subject = data.subject.strip()
        description = data.description.strip()
        if len(subject) < 6:
            raise InvalidTicketActionError("Informe um assunto com pelo menos 6 caracteres.")
        if len(description) < 20:
            raise InvalidTicketActionError("Conte um pouco mais sobre o problema (mínimo de 20 caracteres).")
        if data.category not in TicketCategory.values:
            raise InvalidTicketActionError("Categoria inválida.")
        if data.priority not in TicketPriority.values:
            raise InvalidTicketActionError("Prioridade inválida.")
        with self._unit_of_work:
            ticket = self._tickets.create(
                data.user_id,
                subject=subject[:160],
                description=description,
                category=data.category,
                priority=data.priority,
                context=data.context if isinstance(data.context, dict) else {},
            )
            return self._tickets.dump_ticket(ticket, detail=True)


@dataclass(frozen=True, slots=True)
class GetCustomerTicketInput:
    """Dados de entrada de ``GetCustomerTicketUseCase.execute``."""

    user_id: UUID
    ticket_id: UUID


class GetCustomerTicketUseCase(UseCase[GetCustomerTicketInput, dict]):
    """Consulta um chamado do próprio usuário.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetCustomerTicketInput``.
    """

    def __init__(self, tickets: ITicketRepository) -> None:
        self._tickets = tickets

    def execute(self, data: GetCustomerTicketInput) -> dict:
        ticket = self._tickets.get_for_user(data.ticket_id, data.user_id)
        if ticket is None:
            raise TicketNotFoundError()
        return self._tickets.dump_ticket(ticket, detail=True)


@dataclass(frozen=True, slots=True)
class ReplyCustomerTicketInput:
    """Dados de entrada de ``ReplyCustomerTicketUseCase.execute``."""

    user_id: UUID
    ticket_id: UUID
    body: str


class ReplyCustomerTicketUseCase(UseCase[ReplyCustomerTicketInput, dict]):
    """Envia mensagem do jogador no chamado e notifica o atendente quando houver.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ReplyCustomerTicketInput``.
    """

    def __init__(self, tickets: ITicketRepository, unit_of_work: UnitOfWork) -> None:
        self._tickets = tickets
        self._unit_of_work = unit_of_work

    def execute(self, data: ReplyCustomerTicketInput) -> dict:
        ticket = self._tickets.get_for_user(data.ticket_id, data.user_id)
        if ticket is None:
            raise TicketNotFoundError()
        if ticket.status in CLOSED_STATUSES:
            raise InvalidTicketActionError("Reabra o chamado antes de enviar uma mensagem.")
        body = data.body.strip()
        if len(body) < 2:
            raise InvalidTicketActionError("Escreva uma mensagem para a equipe.")
        with self._unit_of_work:
            ticket = self._tickets.add_customer_reply(data.ticket_id, data.user_id, body)
            return self._tickets.dump_ticket(ticket, detail=True)


@dataclass(frozen=True, slots=True)
class UpdateCustomerTicketInput:
    """Dados de entrada de ``UpdateCustomerTicketUseCase.execute``."""

    user_id: UUID
    ticket_id: UUID
    action: str | None


class UpdateCustomerTicketUseCase(UseCase[UpdateCustomerTicketInput, dict]):
    """Encerra ou reabre o chamado do próprio jogador conforme a ação informada.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateCustomerTicketInput``.
    """

    def __init__(self, tickets: ITicketRepository, unit_of_work: UnitOfWork) -> None:
        self._tickets = tickets
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateCustomerTicketInput) -> dict:
        ticket = self._tickets.get_for_user(data.ticket_id, data.user_id)
        if ticket is None:
            raise TicketNotFoundError()
        action = data.action
        can_close = action == "close" and ticket.status in ACTIVE_STATUSES | {TicketStatus.RESOLVED}
        can_reopen = action == "reopen" and ticket.status in CLOSED_STATUSES
        if not (can_close or can_reopen):
            raise InvalidTicketActionError("Esta ação não está disponível para o chamado.")
        with self._unit_of_work:
            ticket = self._tickets.apply_customer_action(data.ticket_id, data.user_id, action)
            return self._tickets.dump_ticket(ticket, detail=True)


@dataclass(frozen=True, slots=True)
class ListStaffTicketsInput:
    """Dados de entrada de ``ListStaffTicketsUseCase.execute``."""

    status: str = ""
    category: str = ""
    query: str = ""


@dataclass(frozen=True, slots=True)
class StaffTicketListResult:
    """Fila de atendimento com indicadores agregados."""

    tickets: list[dict]
    summary: dict[str, int]


class ListStaffTicketsUseCase(UseCase[ListStaffTicketsInput, StaffTicketListResult]):
    """Lista chamados para a equipe com filtros e indicadores de atendimento.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListStaffTicketsInput``.
    """

    def __init__(self, tickets: ITicketRepository) -> None:
        self._tickets = tickets

    def execute(self, data: ListStaffTicketsInput) -> StaffTicketListResult:
        return StaffTicketListResult(
            tickets=[
                self._tickets.dump_ticket(row, staff=True)
                for row in self._tickets.list_for_staff(
                    status=data.status,
                    category=data.category,
                    query=data.query,
                )
            ],
            summary=self._tickets.summarize_for_staff(),
        )


@dataclass(frozen=True, slots=True)
class GetStaffTicketInput:
    """Dados de entrada de ``GetStaffTicketUseCase.execute``."""

    ticket_id: UUID


class GetStaffTicketUseCase(UseCase[GetStaffTicketInput, dict]):
    """Consulta um chamado com visão administrativa.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetStaffTicketInput``.
    """

    def __init__(self, tickets: ITicketRepository) -> None:
        self._tickets = tickets

    def execute(self, data: GetStaffTicketInput) -> dict:
        ticket = self._tickets.get_by_id(data.ticket_id)
        if ticket is None:
            raise TicketNotFoundError()
        return self._tickets.dump_ticket(ticket, detail=True, staff=True)


@dataclass(frozen=True, slots=True)
class ReplyStaffTicketInput:
    """Dados de entrada de ``ReplyStaffTicketUseCase.execute``."""

    ticket_id: UUID
    actor_id: UUID
    body: str
    is_internal: bool = False


class ReplyStaffTicketUseCase(UseCase[ReplyStaffTicketInput, dict]):
    """Permite à equipe responder um chamado, inclusive com notas internas.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ReplyStaffTicketInput``.
    """

    def __init__(self, tickets: ITicketRepository, unit_of_work: UnitOfWork) -> None:
        self._tickets = tickets
        self._unit_of_work = unit_of_work

    def execute(self, data: ReplyStaffTicketInput) -> dict:
        ticket = self._tickets.get_by_id(data.ticket_id)
        if ticket is None:
            raise TicketNotFoundError()
        if ticket.status in CLOSED_STATUSES:
            raise InvalidTicketActionError("Reabra o chamado antes de enviar uma mensagem.")
        body = data.body.strip()
        if len(body) < 2:
            raise InvalidTicketActionError("Escreva uma resposta.")
        with self._unit_of_work:
            ticket = self._tickets.add_staff_reply(
                data.ticket_id,
                data.actor_id,
                body,
                is_internal=data.is_internal,
            )
            return self._tickets.dump_ticket(ticket, detail=True, staff=True)


@dataclass(frozen=True, slots=True)
class UpdateStaffTicketInput:
    """Dados de entrada de ``UpdateStaffTicketUseCase.execute``."""

    ticket_id: UUID
    actor_id: UUID
    status: str | None = None
    update_status: bool = False
    priority: str | None = None
    update_priority: bool = False
    assigned_to: Any = None
    update_assigned_to: bool = False


class UpdateStaffTicketUseCase(UseCase[UpdateStaffTicketInput, dict]):
    """Atribui responsáveis e atualiza o estado de um chamado pela equipe.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateStaffTicketInput``.
    """

    def __init__(self, tickets: ITicketRepository, unit_of_work: UnitOfWork) -> None:
        self._tickets = tickets
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateStaffTicketInput) -> dict:
        ticket = self._tickets.get_by_id(data.ticket_id)
        if ticket is None:
            raise TicketNotFoundError()

        if data.update_status and data.status not in TicketStatus.values:
            raise InvalidTicketActionError("Status inválido.")
        if data.update_priority and data.priority not in TicketPriority.values:
            raise InvalidTicketActionError("Prioridade inválida.")

        assignee = None
        if data.update_assigned_to:
            if data.assigned_to == "me":
                assignee = self._tickets.resolve_staff_assignee("me", data.actor_id)
            elif not data.assigned_to:
                assignee = None
            else:
                assignee = self._tickets.resolve_staff_assignee(data.assigned_to, data.actor_id)
                if assignee is None:
                    raise InvalidTicketActionError("Atendente não encontrado.")

        with self._unit_of_work:
            ticket = self._tickets.update_staff_ticket(
                data.ticket_id,
                data.actor_id,
                status=data.status,
                update_status=data.update_status,
                priority=data.priority,
                update_priority=data.update_priority,
                assignee=assignee,
                update_assignee=data.update_assigned_to,
            )
            return self._tickets.dump_ticket(ticket, detail=True, staff=True)
