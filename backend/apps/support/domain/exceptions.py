from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


class TicketNotFoundError(EntityNotFoundError):
    """Falha de domínio: Chamado não encontrado.

    A apresentação expõe o código ``TICKET_NOT_FOUND`` com status HTTP 404. Lance esta exceção
    quando a condição ocorrer na regra de negócio.
    """

    error_code = "TICKET_NOT_FOUND"
    message = "Chamado não encontrado."


class InvalidTicketActionError(ValidationDomainError):
    """Falha de domínio: solicitação de atendimento inválida ou indisponível.

    A apresentação expõe o código ``INVALID_SUPPORT_REQUEST`` com status HTTP 400. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "INVALID_SUPPORT_REQUEST"
    message = "Esta ação não está disponível para o chamado."
