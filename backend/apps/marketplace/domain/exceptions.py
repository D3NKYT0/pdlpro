from common.architecture.exceptions import ConflictError, EntityNotFoundError, ValidationDomainError


class ListingNotFoundError(EntityNotFoundError):
    message = "Anúncio não encontrado."


class ListingNotForSaleError(ValidationDomainError):
    message = "Este personagem não está à venda."


class CannotBuyOwnListingError(ValidationDomainError):
    message = "Você não pode comprar o próprio personagem."


class CharacterAlreadyListedError(ConflictError):
    message = "Este personagem já está listado para venda."


class CharacterSlotLimitError(ValidationDomainError):
    message = "A conta já atingiu o limite de personagens do cliente Lineage 2."


class InvalidListingPriceError(ValidationDomainError):
    message = "O preço deve ser maior que zero."
