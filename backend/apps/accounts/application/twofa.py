from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

import pyotp
from django.core import signing

from apps.accounts.domain.exceptions import InvalidTwoFactorError, UserNotFoundError
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError

TWOFA_SALT = "pdl-2fa-login"


def make_login_challenge(user_id: UUID) -> str:
    return signing.dumps({"uid": str(user_id)}, salt=TWOFA_SALT)


def read_login_challenge(token: str) -> UUID:
    try:
        payload = signing.loads(token, salt=TWOFA_SALT, max_age=300)
    except signing.BadSignature as exc:
        raise InvalidTwoFactorError("Desafio 2FA expirado. Entre novamente.") from exc
    return UUID(payload["uid"])


def _verify(secret: str, code: str) -> bool:
    if not secret or not code:
        return False
    return pyotp.TOTP(secret).verify(code.strip(), valid_window=1)


class SetupTwoFactorUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data)
        if user.is_2fa_enabled:
            raise ValidationDomainError("O 2FA já está ativo.")
        secret = pyotp.random_base32()
        user.totp_secret = secret
        user.save(update_fields=["totp_secret", "updated_at"])
        uri = pyotp.TOTP(secret).provisioning_uri(name=user.username, issuer_name="PDL PRO")
        return {"secret": secret, "otpauth_url": uri, "enabled": False}


@dataclass(frozen=True, slots=True)
class ConfirmTwoFactorInput:
    user_id: UUID
    code: str


class ConfirmTwoFactorUseCase(UseCase[ConfirmTwoFactorInput, dict]):
    def execute(self, data: ConfirmTwoFactorInput) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data.user_id)
        if not _verify(user.totp_secret, data.code):
            raise InvalidTwoFactorError()
        user.is_2fa_enabled = True
        user.save(update_fields=["is_2fa_enabled", "updated_at"])
        return {"enabled": True}


@dataclass(frozen=True, slots=True)
class DisableTwoFactorInput:
    user_id: UUID
    code: str


class DisableTwoFactorUseCase(UseCase[DisableTwoFactorInput, dict]):
    def execute(self, data: DisableTwoFactorInput) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data.user_id)
        if not user.is_2fa_enabled or not _verify(user.totp_secret, data.code):
            raise InvalidTwoFactorError()
        user.is_2fa_enabled = False
        user.totp_secret = ""
        user.save(update_fields=["is_2fa_enabled", "totp_secret", "updated_at"])
        return {"enabled": False}


@dataclass(frozen=True, slots=True)
class VerifyTwoFactorLoginInput:
    challenge: str
    code: str


class VerifyTwoFactorLoginUseCase(UseCase[VerifyTwoFactorLoginInput, object]):
    def execute(self, data: VerifyTwoFactorLoginInput) -> object:
        from django.contrib.auth import get_user_model

        user_id = read_login_challenge(data.challenge)
        user = get_user_model().objects.filter(id=user_id).first()
        if user is None:
            raise UserNotFoundError()
        if not user.is_2fa_enabled or not _verify(user.totp_secret, data.code):
            raise InvalidTwoFactorError()
        return user
