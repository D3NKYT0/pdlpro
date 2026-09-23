from common.architecture.exceptions import (
    ConflictError,
    DomainError,
    EntityNotFoundError,
    ValidationDomainError,
)


class LineageUnavailableError(DomainError):
    """Falha de domínio: O banco do servidor Lineage não está disponível.

    A apresentação expõe o código ``LINEAGE_UNAVAILABLE`` com status HTTP 503. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "LINEAGE_UNAVAILABLE"
    status_code = 503
    message = "O banco do servidor Lineage não está disponível."


class GameAccountNotFoundError(EntityNotFoundError):
    """Falha de domínio: Conta Lineage não encontrada.

    A apresentação expõe o código ``GAME_ACCOUNT_NOT_FOUND``. Lance esta exceção quando a
    condição ocorrer na regra de negócio.
    """

    error_code = "GAME_ACCOUNT_NOT_FOUND"
    message = "Conta Lineage não encontrada."


class GameAccountAlreadyExistsError(ConflictError):
    """Falha de domínio: Já existe uma conta Lineage com este login.

    A apresentação expõe o código ``GAME_ACCOUNT_EXISTS``. Lance esta exceção quando a condição
    ocorrer na regra de negócio.
    """

    error_code = "GAME_ACCOUNT_EXISTS"
    message = "Já existe uma conta Lineage com este login."


class ComingSoonL2RegistrationRestrictedError(DomainError):
    """Falha de domínio: criação de conta L2 fechada durante o Coming Soon.

    A apresentação expõe o código ``COMING_SOON_L2_REGISTRATION_RESTRICTED`` com status HTTP 403.
    """

    error_code = "COMING_SOON_L2_REGISTRATION_RESTRICTED"
    status_code = 403
    message = (
        "O servidor está em período de lançamento. A criação de contas do jogo está fechada no momento."
    )


class AccountAlreadyLinkedError(ConflictError):
    """Falha de domínio: Esta conta Lineage já está vinculada.

    A apresentação expõe o código ``ACCOUNT_ALREADY_LINKED``. Lance esta exceção quando a
    condição ocorrer na regra de negócio.
    """

    error_code = "ACCOUNT_ALREADY_LINKED"
    message = "Esta conta Lineage já está vinculada."


class LinkSlotLimitError(DomainError):
    """Falha de domínio: Limite de contas vinculadas atingido. Compre um slot extra.

    A apresentação expõe o código ``LINK_SLOT_LIMIT`` com status HTTP 400. Lance esta exceção
    quando a condição ocorrer na regra de negócio.
    """

    error_code = "LINK_SLOT_LIMIT"
    status_code = 400
    message = "Limite de contas vinculadas atingido. Compre um slot extra."


class CharacterOfflineRequiredError(ValidationDomainError):
    """Falha de domínio: O personagem precisa estar offline.

    A apresentação expõe o código ``CHARACTER_MUST_BE_OFFLINE``. Lance esta exceção quando a
    condição ocorrer na regra de negócio.
    """

    error_code = "CHARACTER_MUST_BE_OFFLINE"
    message = "O personagem precisa estar offline."


class NicknameTakenError(ConflictError):
    """Falha de domínio: Este nick já está em uso.

    A apresentação expõe o código ``NICKNAME_TAKEN``. Lance esta exceção quando a condição
    ocorrer na regra de negócio.
    """

    error_code = "NICKNAME_TAKEN"
    message = "Este nick já está em uso."


class CharacterServiceUnavailableError(ValidationDomainError):
    """Falha de domínio: O serviço de personagem não está disponível neste servidor.

    A apresentação expõe o código ``SERVICE_UNAVAILABLE``. Lance quando o dialeto não tiver
    a consulta ou a staff tiver desativado o serviço.
    """

    error_code = "SERVICE_UNAVAILABLE"
    message = "Este serviço não está disponível neste servidor."
