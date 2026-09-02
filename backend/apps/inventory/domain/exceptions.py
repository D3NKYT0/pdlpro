from common.architecture.exceptions import DomainError, EntityNotFoundError, ValidationDomainError


class InventoryNotFoundError(EntityNotFoundError):
    """Falha de domínio: Inventário não encontrado."""

    message = "Inventário não encontrado."


class ItemBlockedError(DomainError):
    """Falha de domínio: Este item não pode ser retirado do jogo.

    A apresentação expõe o código ``ITEM_BLOCKED`` com status HTTP 400. Lance esta exceção
    quando a condição ocorrer na regra de negócio.
    """

    error_code = "ITEM_BLOCKED"
    status_code = 400
    message = "Este item não pode ser retirado do jogo."


class InsufficientItemQuantityError(ValidationDomainError):
    """Falha de domínio: Quantidade insuficiente no inventário do painel.

    A apresentação expõe o código ``INSUFFICIENT_ITEM_QUANTITY``. Lance esta exceção quando a
    condição ocorrer na regra de negócio.
    """

    error_code = "INSUFFICIENT_ITEM_QUANTITY"
    message = "Quantidade insuficiente no inventário do painel."
