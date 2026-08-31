from common.architecture.exceptions import ConflictError, DomainError, EntityNotFoundError, ValidationDomainError


class LineageUnavailableError(DomainError):
    error_code = "LINEAGE_UNAVAILABLE"
    status_code = 503
    message = "O banco do servidor Lineage não está disponível."


class GameAccountNotFoundError(EntityNotFoundError):
    error_code = "GAME_ACCOUNT_NOT_FOUND"
    message = "Conta Lineage não encontrada."


class GameAccountAlreadyExistsError(ConflictError):
    error_code = "GAME_ACCOUNT_EXISTS"
    message = "Já existe uma conta Lineage com este login."


class AccountAlreadyLinkedError(ConflictError):
    error_code = "ACCOUNT_ALREADY_LINKED"
    message = "Esta conta Lineage já está vinculada."


class LinkSlotLimitError(DomainError):
    error_code = "LINK_SLOT_LIMIT"
    status_code = 400
    message = "Limite de contas vinculadas atingido. Compre um slot extra."


class CharacterOfflineRequiredError(ValidationDomainError):
    error_code = "CHARACTER_MUST_BE_OFFLINE"
    message = "O personagem precisa estar offline."


class NicknameTakenError(ConflictError):
    error_code = "NICKNAME_TAKEN"
    message = "Este nick já está em uso."
