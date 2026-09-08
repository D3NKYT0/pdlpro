from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.accounts.domain.entities import UserEntity
from apps.accounts.domain.exceptions import (
    EmailTakenError,
    InvalidCredentialsError,
    UsernameTakenError,
    UserNotFoundError,
)
from django.conf import settings

from apps.accounts.application.email_use_cases import RequestEmailVerificationUseCase
from apps.accounts.domain.repositories import IUserRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError


@dataclass(frozen=True, slots=True)
class RegisterUserInput:
    """Dados de entrada de ``RegisterUserUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    username: str
    email: str
    password: str
    display_name: str = ""
    accept_terms: bool = False


class RegisterUserUseCase(UseCase[RegisterUserInput, UserEntity]):
    """Valida o aceite legal e a unicidade de usuário/e-mail, cria a conta e registra a versão
    aceita em transação. Solicita o e-mail de verificação após a gravação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RegisterUserInput``. O retorno é
    ``UserEntity``.
    """

    def __init__(
        self,
        users: IUserRepository,
        unit_of_work: UnitOfWork,
        request_email_verification: RequestEmailVerificationUseCase,
    ) -> None:
        self._users = users
        self._unit_of_work = unit_of_work
        self._request_email_verification = request_email_verification

    def execute(self, data: RegisterUserInput) -> UserEntity:
        if not data.accept_terms:
            raise ValidationDomainError("Aceite os termos de uso e a política de privacidade.")
        username = data.username.strip()
        email = data.email.strip().lower()
        if self._users.exists_username(username):
            raise UsernameTakenError()
        if self._users.exists_email(email):
            raise EmailTakenError()
        with self._unit_of_work:
            user = self._users.create(
                username=username,
                email=email,
                password=data.password,
                display_name=data.display_name.strip() or username,
            )
            user = self._users.accept_terms(user.id, getattr(settings, "LEGAL_DOCS_VERSION", "2026-08-31"))
        self._request_email_verification.execute(user.id)
        return user


@dataclass(frozen=True, slots=True)
class AuthenticateUserInput:
    """Dados de entrada de ``AuthenticateUserUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    login: str
    password: str


class AuthenticateUserUseCase(UseCase[AuthenticateUserInput, UserEntity]):
    """Confere login e senha e retorna UserEntity ou InvalidCredentialsError. A emissão de tokens e
    a etapa de 2FA são tratadas pela apresentação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``AuthenticateUserInput``. O
    retorno é ``UserEntity``.
    """

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: AuthenticateUserInput) -> UserEntity:
        user = self._users.get_by_login(data.login.strip())
        if user is None or not self._users.check_password(user.id, data.password):
            raise InvalidCredentialsError()
        from apps.server.application.access import assert_login_allowed_during_coming_soon

        assert_login_allowed_during_coming_soon(user)
        return user


@dataclass(frozen=True, slots=True)
class GetCurrentUserInput:
    """Dados de entrada de ``GetCurrentUserUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class GetCurrentUserUseCase(UseCase[GetCurrentUserInput, UserEntity]):
    """Consulta o usuário pelo UUID informado e sinaliza UserNotFoundError quando ausente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetCurrentUserInput``. O retorno
    é ``UserEntity``.
    """

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: GetCurrentUserInput) -> UserEntity:
        user = self._users.get_by_id(data.user_id)
        if user is None:
            raise UserNotFoundError()
        return user


@dataclass(frozen=True, slots=True)
class UpdateProfileInput:
    """Dados de entrada de ``UpdateProfileUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    display_name: str | None = None
    bio: str | None = None
    avatar: object | None = None


class UpdateProfileUseCase(UseCase[UpdateProfileInput, UserEntity]):
    """Atualiza nome de exibição, biografia e avatar de um usuário existente em transação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateProfileInput``. O retorno
    é ``UserEntity``.
    """

    def __init__(self, users: IUserRepository, unit_of_work: UnitOfWork) -> None:
        self._users = users
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateProfileInput) -> UserEntity:
        if self._users.get_by_id(data.user_id) is None:
            raise UserNotFoundError()
        with self._unit_of_work:
            return self._users.update_profile(
                data.user_id,
                display_name=data.display_name,
                bio=data.bio,
                avatar=data.avatar,
            )


@dataclass(frozen=True, slots=True)
class CompleteCredentialsInput:
    """Dados de entrada de ``CompleteCredentialsUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    username: str
    password: str
    accept_terms: bool = False


class CompleteCredentialsUseCase(UseCase[CompleteCredentialsInput, UserEntity]):
    """Define login e senha para contas criadas por OAuth ainda sem credenciais locais.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CompleteCredentialsInput``. O
    retorno é ``UserEntity``.
    """

    def __init__(self, users: IUserRepository, unit_of_work: UnitOfWork) -> None:
        self._users = users
        self._unit_of_work = unit_of_work

    def execute(self, data: CompleteCredentialsInput) -> UserEntity:
        user = self._users.get_by_id(data.user_id)
        if user is None:
            raise UserNotFoundError()
        if self._users.has_usable_password(data.user_id):
            raise ValidationDomainError("Esta conta já possui login e senha definidos.")
        if not data.accept_terms:
            raise ValidationDomainError("Aceite os termos de uso e a política de privacidade.")
        username = data.username.strip()
        if len(username) < 3 or len(username) > 16:
            raise ValidationDomainError("O usuário deve ter entre 3 e 16 caracteres.")
        if username.lower() != user.username.lower() and self._users.exists_username(username):
            raise UsernameTakenError()
        with self._unit_of_work:
            if username.lower() != user.username.lower():
                user = self._users.update_username(data.user_id, username)
            self._users.set_password(data.user_id, data.password)
            return self._users.accept_terms(data.user_id, getattr(settings, "LEGAL_DOCS_VERSION", "2026-08-31"))
