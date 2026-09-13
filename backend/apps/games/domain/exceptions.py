from common.architecture.exceptions import (
    ConflictError,
    DomainError,
    ValidationDomainError,
)


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


class BoxResetBlockedError(ValidationDomainError):
    """Falha de domínio: não dá para resetar um baú ainda intacto.

    A apresentação expõe o código ``BOX_RESET_BLOCKED``. Lance esta exceção quando o jogador
    tentar comprar de novo um tipo cuja caixa ainda não teve nenhum pacote aberto.
    """

    error_code = "BOX_RESET_BLOCKED"
    message = "Abra pelo menos um pacote antes de resetar este baú."


class InvalidRewardError(ValidationDomainError):
    """Falha de domínio: configuração ou payload de recompensa inválido."""

    error_code = "INVALID_REWARD"
    message = "Recompensa inválida."
