from common.architecture.exceptions import ConflictError, DomainError, ValidationDomainError


class InsufficientTokensError(DomainError):
    """Falha de domínio: Fichas insuficientes.

    A apresentação expõe o código ``INSUFFICIENT_TOKENS`` com status HTTP 400. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "INSUFFICIENT_TOKENS"
    status_code = 400
    message = "Fichas insuficientes."


class AlreadyClaimedError(ConflictError):
    """Falha de domínio: Você já resgatou o bônus de hoje.

    A apresentação expõe o código ``ALREADY_CLAIMED``. Lance esta exceção quando a condição
    ocorrer na regra de negócio.
    """

    error_code = "ALREADY_CLAIMED"
    message = "Você já resgatou o bônus de hoje."


class GameInactiveError(ValidationDomainError):
    """Falha de domínio: Este jogo não está ativo."""

    message = "Este jogo não está ativo."


class BoxEmptyError(ValidationDomainError):
    """Falha de domínio: Esta caixa não tem boosters restantes."""

    message = "Esta caixa não tem boosters restantes."


class BoxNotOwnedError(ValidationDomainError):
    """Falha de domínio: Essa caixa não pertence a você."""

    message = "Essa caixa não pertence a você."
