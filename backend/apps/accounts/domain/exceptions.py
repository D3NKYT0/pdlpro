from common.architecture.exceptions import ConflictError, DomainError, EntityNotFoundError


class UserNotFoundError(EntityNotFoundError):
    """Falha de domínio: Usuário não encontrado."""

    message = "Usuário não encontrado."


class UsernameTakenError(ConflictError):
    """Falha de domínio: Este nome de usuário já está em uso.

    A apresentação expõe o código ``USERNAME_TAKEN``. Lance esta exceção quando a condição
    ocorrer na regra de negócio.
    """

    error_code = "USERNAME_TAKEN"
    message = "Este nome de usuário já está em uso."


class EmailTakenError(ConflictError):
    """Falha de domínio: Este e-mail já está em uso.

    A apresentação expõe o código ``EMAIL_TAKEN``. Lance esta exceção quando a condição ocorrer
    na regra de negócio.
    """

    error_code = "EMAIL_TAKEN"
    message = "Este e-mail já está em uso."


class InvalidCredentialsError(DomainError):
    """Falha de domínio: Usuário ou senha inválidos.

    A apresentação expõe o código ``INVALID_CREDENTIALS`` com status HTTP 401. Lance esta
    exceção quando a condição ocorrer na regra de negócio.
    """

    error_code = "INVALID_CREDENTIALS"
    status_code = 401
    message = "Usuário ou senha inválidos."


class InvalidTwoFactorError(DomainError):
    """Falha de domínio: Código 2FA inválido.

    A apresentação expõe o código ``INVALID_2FA`` com status HTTP 400. Lance esta exceção quando
    a condição ocorrer na regra de negócio.
    """

    error_code = "INVALID_2FA"
    status_code = 400
    message = "Código 2FA inválido."
