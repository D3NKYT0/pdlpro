from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import pyotp
from django.core import signing

from apps.accounts.domain.entities import UserEntity
from apps.accounts.domain.exceptions import InvalidTwoFactorError, UserNotFoundError
from apps.accounts.domain.repositories import IUserRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError

TWOFA_SALT = "pdl-2fa-login"


def make_login_challenge(user_id: UUID) -> str:
    return signing.dumps({"uid": str(user_id)}, salt=TWOFA_SALT)


def read_login_challenge(token: str) -> UUID:
    try:
        payload = signing.loads(token, salt=TWOFA_SALT, max_age=300)
        return UUID(str(payload["uid"]))
    except (signing.BadSignature, KeyError, TypeError, ValueError) as exc:
        raise InvalidTwoFactorError("Desafio 2FA expirado. Entre novamente.") from exc


def _verify(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)


class SetupTwoFactorUseCase(UseCase[UUID, dict]):
    """Gera e salva um segredo TOTP e retorna a URI de provisionamento. O 2FA só é ativado depois
    da confirmação do código.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: UUID) -> dict:
        state = self._users.get_totp_state(data)
        if state is None:
            raise UserNotFoundError()
        if state.is_2fa_enabled:
            raise ValidationDomainError("O 2FA já está ativo.")
        secret = pyotp.random_base32()
        self._users.set_totp_secret(data, secret)
        uri = pyotp.TOTP(secret).provisioning_uri(name=state.username, issuer_name="PDL PRO")
        return {"secret": secret, "otpauth_url": uri, "enabled": False}


@dataclass(frozen=True, slots=True)
class ConfirmTwoFactorInput:
    """Dados de entrada de ``ConfirmTwoFactorUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    code: str


class ConfirmTwoFactorUseCase(UseCase[ConfirmTwoFactorInput, dict]):
    """Confere o código TOTP contra o segredo salvo e ativa o segundo fator.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ConfirmTwoFactorInput``. O
    retorno é ``dict``.
    """

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: ConfirmTwoFactorInput) -> dict:
        state = self._users.get_totp_state(data.user_id)
        if state is None:
            raise UserNotFoundError()
        if not _verify(state.totp_secret, data.code):
            raise InvalidTwoFactorError()
        self._users.enable_2fa(data.user_id)
        return {"enabled": True}


@dataclass(frozen=True, slots=True)
class DisableTwoFactorInput:
    """Dados de entrada de ``DisableTwoFactorUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    code: str


class DisableTwoFactorUseCase(UseCase[DisableTwoFactorInput, dict]):
    """Exige 2FA ativo e código válido para desativar o segundo fator e apagar o segredo TOTP.

    Uso: resolva pelo container e chame ``execute(data)`` com ``DisableTwoFactorInput``. O
    retorno é ``dict``.
    """

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: DisableTwoFactorInput) -> dict:
        state = self._users.get_totp_state(data.user_id)
        if state is None:
            raise UserNotFoundError()
        if not state.is_2fa_enabled or not _verify(state.totp_secret, data.code):
            raise InvalidTwoFactorError()
        self._users.disable_2fa(data.user_id)
        return {"enabled": False}


@dataclass(frozen=True, slots=True)
class VerifyTwoFactorLoginInput:
    """Dados de entrada de ``VerifyTwoFactorLoginUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    challenge: str
    code: str


class VerifyTwoFactorLoginUseCase(UseCase[VerifyTwoFactorLoginInput, UserEntity]):
    """Valida o desafio assinado e o código TOTP e retorna a entidade do usuário para concluir o
    login.

    Uso: resolva pelo container e chame ``execute(data)`` com ``VerifyTwoFactorLoginInput``. O
    retorno é ``UserEntity``.
    """

    def __init__(self, users: IUserRepository) -> None:
        self._users = users

    def execute(self, data: VerifyTwoFactorLoginInput) -> UserEntity:
        user_id = read_login_challenge(data.challenge)
        # O usuário pode ser desativado entre a senha e a conclusão do segundo fator.
        state = self._users.get_totp_state(user_id)
        if state is None or not state.is_active:
            raise UserNotFoundError()
        if not state.is_2fa_enabled or not _verify(state.totp_secret, data.code):
            raise InvalidTwoFactorError()
        user = self._users.get_by_id(user_id)
        if user is None:
            raise UserNotFoundError()
        from apps.server.application.access import (
            assert_login_allowed_during_coming_soon,
        )

        assert_login_allowed_during_coming_soon(user)
        return user
