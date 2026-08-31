from common.architecture.exceptions import ConflictError, DomainError, ValidationDomainError


class InsufficientTokensError(DomainError):
    error_code = "INSUFFICIENT_TOKENS"
    status_code = 400
    message = "Fichas insuficientes."


class AlreadyClaimedError(ConflictError):
    error_code = "ALREADY_CLAIMED"
    message = "Você já resgatou o bônus de hoje."


class GameInactiveError(ValidationDomainError):
    message = "Este jogo não está ativo."
