from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


class AuctionNotFoundError(EntityNotFoundError):
    """Falha de domínio: Leilão não encontrado."""

    message = "Leilão não encontrado."


class AuctionNotActiveError(ValidationDomainError):
    """Falha de domínio: Este leilão não está ativo."""

    message = "Este leilão não está ativo."


class InvalidBidError(ValidationDomainError):
    """Falha de domínio: Lance inválido."""

    message = "Lance inválido."


class CannotBidOwnAuctionError(ValidationDomainError):
    """Falha de domínio: Você não pode dar lance no próprio leilão."""

    message = "Você não pode dar lance no próprio leilão."


class InvalidAuctionDurationError(ValidationDomainError):
    """Falha de domínio: Duração do leilão inválida."""

    message = "Duração do leilão inválida."
