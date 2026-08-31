from common.architecture.exceptions import ConflictError, DomainError, EntityNotFoundError


class UserNotFoundError(EntityNotFoundError):
    message = "Usuário não encontrado."


class UsernameTakenError(ConflictError):
    error_code = "USERNAME_TAKEN"
    message = "Este nome de usuário já está em uso."


class EmailTakenError(ConflictError):
    error_code = "EMAIL_TAKEN"
    message = "Este e-mail já está em uso."


class InvalidCredentialsError(DomainError):
    error_code = "INVALID_CREDENTIALS"
    status_code = 401
    message = "Usuário ou senha inválidos."


class InvalidTwoFactorError(DomainError):
    error_code = "INVALID_2FA"
    status_code = 400
    message = "Código 2FA inválido."
