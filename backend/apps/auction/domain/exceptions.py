from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


class AuctionNotFoundError(EntityNotFoundError):
    message = "Leilão não encontrado."


class AuctionNotActiveError(ValidationDomainError):
    message = "Este leilão não está ativo."


class InvalidBidError(ValidationDomainError):
    message = "Lance inválido."


class CannotBidOwnAuctionError(ValidationDomainError):
    message = "Você não pode dar lance no próprio leilão."


class InvalidAuctionDurationError(ValidationDomainError):
    message = "Duração do leilão inválida."
