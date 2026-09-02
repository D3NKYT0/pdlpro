from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.conf import settings
from django.core import signing

from apps.accounts.domain.exceptions import UserNotFoundError
from apps.accounts.domain.mailer import IMailer
from apps.accounts.domain.repositories import IUserRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import ValidationDomainError

EMAIL_VERIFY_SALT = "pdl-email-verify"
PASSWORD_RESET_SALT = "pdl-password-reset"
EMAIL_VERIFY_MAX_AGE = 60 * 60 * 48
PASSWORD_RESET_MAX_AGE = 60 * 60


def _frontend_url(path: str) -> str:
    base = getattr(settings, "FRONTEND_URL", "") or getattr(settings, "PROJECT_URL", "http://localhost:3000")
    return f"{base.rstrip('/')}{path}"


class RequestEmailVerificationUseCase(UseCase[UUID, dict]):
    """Envia link assinado para verificar o e-mail; se já estiver verificado, retorna
    already_verified sem enviar novamente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, users: IUserRepository, mailer: IMailer) -> None:
        self._users = users
        self._mailer = mailer

    def execute(self, data: UUID) -> dict:
        user = self._users.get_by_id(data)
        if user is None:
            raise UserNotFoundError()
        if user.is_email_verified:
            return {"sent": False, "already_verified": True}
        token = signing.dumps({"uid": str(user.id)}, salt=EMAIL_VERIFY_SALT)
        link = _frontend_url(f"/verify-email?token={token}")
        self._mailer.send(
            user.email,
            "Confirme seu e-mail no PDL PRO",
            f"Olá, {user.username}.\n\nConfirme seu e-mail neste link (válido por 48h):\n{link}\n",
        )
        return {"sent": True, "already_verified": False}


@dataclass(frozen=True, slots=True)
class VerifyEmailInput:
    """Dados de entrada de ``VerifyEmailUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    token: str


class VerifyEmailUseCase(UseCase[VerifyEmailInput, dict]):
    """Valida assinatura e expiração do token e marca o e-mail do usuário como verificado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``VerifyEmailInput``. O retorno é
    ``dict``.
    """

    def __init__(self, users: IUserRepository, unit_of_work: UnitOfWork) -> None:
        self._users = users
        self._unit_of_work = unit_of_work

    def execute(self, data: VerifyEmailInput) -> dict:
        try:
            payload = signing.loads(data.token, salt=EMAIL_VERIFY_SALT, max_age=EMAIL_VERIFY_MAX_AGE)
        except signing.BadSignature as exc:
            raise ValidationDomainError("Link de verificação inválido ou expirado.") from exc
        user_id = UUID(payload["uid"])
        if self._users.get_by_id(user_id) is None:
            raise UserNotFoundError()
        with self._unit_of_work:
            user = self._users.mark_email_verified(user_id)
        return {"verified": True, "username": user.username}


@dataclass(frozen=True, slots=True)
class RequestPasswordResetInput:
    """Dados de entrada de ``RequestPasswordResetUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    email: str


class RequestPasswordResetUseCase(UseCase[RequestPasswordResetInput, dict]):
    """Envia um link assinado para redefinição de senha. Retorna sent=True também para e-mail
    desconhecido, evitando revelar se há uma conta cadastrada.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RequestPasswordResetInput``. O
    retorno é ``dict``.
    """

    def __init__(self, users: IUserRepository, mailer: IMailer) -> None:
        self._users = users
        self._mailer = mailer

    def execute(self, data: RequestPasswordResetInput) -> dict:
        user = self._users.get_by_email(data.email.strip().lower())
        if user is None:
            return {"sent": True}
        token = signing.dumps({"uid": str(user.id)}, salt=PASSWORD_RESET_SALT)
        link = _frontend_url(f"/reset-password?token={token}")
        self._mailer.send(
            user.email,
            "Redefinir senha do PDL PRO",
            f"Olá, {user.username}.\n\nRedefina sua senha neste link (válido por 1 hora):\n{link}\n",
        )
        return {"sent": True}


@dataclass(frozen=True, slots=True)
class ConfirmPasswordResetInput:
    """Dados de entrada de ``ConfirmPasswordResetUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    token: str
    password: str


class ConfirmPasswordResetUseCase(UseCase[ConfirmPasswordResetInput, dict]):
    """Valida o token de redefinição e o tamanho mínimo da senha e grava a nova senha pela porta de
    usuários.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ConfirmPasswordResetInput``. O
    retorno é ``dict``.
    """

    def __init__(self, users: IUserRepository, unit_of_work: UnitOfWork) -> None:
        self._users = users
        self._unit_of_work = unit_of_work

    def execute(self, data: ConfirmPasswordResetInput) -> dict:
        if len(data.password) < 8:
            raise ValidationDomainError("A senha precisa ter ao menos 8 caracteres.")
        try:
            payload = signing.loads(data.token, salt=PASSWORD_RESET_SALT, max_age=PASSWORD_RESET_MAX_AGE)
        except signing.BadSignature as exc:
            raise ValidationDomainError("Link de redefinição inválido ou expirado.") from exc
        user_id = UUID(payload["uid"])
        if self._users.get_by_id(user_id) is None:
            raise UserNotFoundError()
        with self._unit_of_work:
            self._users.set_password(user_id, data.password)
        return {"reset": True}
