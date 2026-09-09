from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


class SupporterNotFoundError(EntityNotFoundError):
    """Falha de domínio: Cadastro de apoiador não encontrado."""

    error_code = "SUPPORTER_NOT_FOUND"
    message = "Cadastro de apoiador não encontrado."


class PayoutNotFoundError(EntityNotFoundError):
    """Falha de domínio: Pedido de repasse não encontrado."""

    error_code = "PAYOUT_NOT_FOUND"
    message = "Pedido de repasse não encontrado."


class RoadmapEntryNotFoundError(EntityNotFoundError):
    """Falha de domínio: Entrada do roadmap não encontrada."""

    error_code = "ROADMAP_NOT_FOUND"
    message = "Entrada do roadmap não encontrada."


class ResourceNotFoundError(EntityNotFoundError):
    """Falha de domínio: Recurso do sistema não encontrado."""

    error_code = "RESOURCE_NOT_FOUND"
    message = "Recurso do sistema não encontrado."


class InvalidProgramActionError(ValidationDomainError):
    """Falha de domínio: ação inválida em programas/apoiadores."""

    error_code = "INVALID_PROGRAM_ACTION"
    message = "Não foi possível processar a solicitação do programa."
