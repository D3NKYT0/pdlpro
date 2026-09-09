from common.architecture.exceptions import (
    ConflictError,
    DomainError,
    EntityNotFoundError,
    ValidationDomainError,
)


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


class ComingSoonLoginRestrictedError(DomainError):
    """Falha de domínio: login restrito à equipe durante o Coming Soon.

    A apresentação expõe o código ``COMING_SOON_LOGIN_RESTRICTED`` com status HTTP 403.
    """

    error_code = "COMING_SOON_LOGIN_RESTRICTED"
    status_code = 403
    message = (
        "O servidor está em período de lançamento. O login está restrito à equipe no momento."
    )


class InvalidTwoFactorError(DomainError):
    """Falha de domínio: Código 2FA inválido.

    A apresentação expõe o código ``INVALID_2FA`` com status HTTP 400. Lance esta exceção quando
    a condição ocorrer na regra de negócio.
    """

    error_code = "INVALID_2FA"
    status_code = 400
    message = "Código 2FA inválido."


class SessionNotFoundError(EntityNotFoundError):
    """Falha de domínio: sessão de refresh inexistente ou já encerrada."""

    message = "Sessão não encontrada."


class SessionAuthenticationError(DomainError):
    """Falha de domínio: refresh token inválido ou alheio à sessão autenticada."""

    error_code = "AUTHENTICATION_FAILED"
    status_code = 401
    message = "Refresh token inválido."


class WebAuthnError(ValidationDomainError):
    """Falha de domínio no fluxo de registro ou autenticação WebAuthn/passkey."""

    message = "Não foi possível validar esta chave de acesso."


class OAuthError(DomainError):
    """Falha de domínio OAuth; o ``error_code`` espelha o contrato HTTP legado."""

    error_code = "OAUTH_ERROR"
    message = "Não foi possível concluir a autenticação social."
