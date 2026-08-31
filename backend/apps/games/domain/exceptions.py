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


class BoxEmptyError(ValidationDomainError):
    message = "Esta caixa não tem boosters restantes."


class BoxNotOwnedError(ValidationDomainError):
    message = "Essa caixa não pertence a você."
