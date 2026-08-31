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
from apps.accounts.domain.repositories import IUserRepository
from common.architecture.base import UnitOfWork, UseCase


@dataclass(frozen=True, slots=True)
class RegisterUserInput:
    username: str
    email: str
    password: str
    display_name: str = ""


class RegisterUserUseCase(UseCase[RegisterUserInput, UserEntity]):
    def __init__(self, users: IUserRepository, unit_of_work: UnitOfWork) -> None:
        self._users = users
        self._unit_of_work = unit_of_work

    def execute(self, data: RegisterUserInput) -> UserEntity:
        username = data.username.strip()
        email = data.email.strip().lower()
        if self._users.exists_username(username):
            raise UsernameTakenError()
        if self._users.exists_email(email):
            raise EmailTakenError()
        with self._unit_of_work:
            return self._users.create(
                username=username,
                email=email,
                password=data.password,
                display_name=data.display_name.strip() or username,
            )


@dataclass(frozen=True, slots=True)
class AuthenticateUserInput:
    login: str
    password: str


class AuthenticateUserUseCase(UseCase[AuthenticateUserInput, UserEntity]):
    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: AuthenticateUserInput) -> UserEntity:
        user = self._users.get_by_login(data.login.strip())
        if user is None or not self._users.check_password(user.id, data.password):
            raise InvalidCredentialsError()
        return user


@dataclass(frozen=True, slots=True)
class GetCurrentUserInput:
    user_id: UUID


class GetCurrentUserUseCase(UseCase[GetCurrentUserInput, UserEntity]):
    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: GetCurrentUserInput) -> UserEntity:
        user = self._users.get_by_id(data.user_id)
        if user is None:
            raise UserNotFoundError()
        return user


@dataclass(frozen=True, slots=True)
class UpdateProfileInput:
    user_id: UUID
    display_name: str | None = None
    bio: str | None = None


class UpdateProfileUseCase(UseCase[UpdateProfileInput, UserEntity]):
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
            )
