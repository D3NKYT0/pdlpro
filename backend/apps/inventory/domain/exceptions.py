from common.architecture.exceptions import DomainError, EntityNotFoundError, ValidationDomainError


class InventoryNotFoundError(EntityNotFoundError):
    message = "Inventário não encontrado."


class ItemBlockedError(DomainError):
    error_code = "ITEM_BLOCKED"
    status_code = 400
    message = "Este item não pode ser retirado do jogo."


class InsufficientItemQuantityError(ValidationDomainError):
    error_code = "INSUFFICIENT_ITEM_QUANTITY"
    message = "Quantidade insuficiente no inventário do painel."
