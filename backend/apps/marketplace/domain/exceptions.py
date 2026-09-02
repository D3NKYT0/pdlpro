from common.architecture.exceptions import ConflictError, EntityNotFoundError, ValidationDomainError


class ListingNotFoundError(EntityNotFoundError):
    """Falha de domínio: Anúncio não encontrado."""

    message = "Anúncio não encontrado."


class ListingNotForSaleError(ValidationDomainError):
    """Falha de domínio: Este personagem não está à venda."""

    message = "Este personagem não está à venda."


class CannotBuyOwnListingError(ValidationDomainError):
    """Falha de domínio: Você não pode comprar o próprio personagem."""

    message = "Você não pode comprar o próprio personagem."


class CharacterAlreadyListedError(ConflictError):
    """Falha de domínio: Este personagem já está listado para venda."""

    message = "Este personagem já está listado para venda."


class CharacterSlotLimitError(ValidationDomainError):
    """Falha de domínio: A conta já atingiu o limite de personagens do cliente Lineage 2."""

    message = "A conta já atingiu o limite de personagens do cliente Lineage 2."


class InvalidListingPriceError(ValidationDomainError):
    """Falha de domínio: O preço deve ser maior que zero."""

    message = "O preço deve ser maior que zero."
