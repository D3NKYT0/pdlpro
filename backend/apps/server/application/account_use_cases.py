from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.accounts.domain.mailer import IMailer
from apps.server.domain.access import AccessibleAccount, IAccountAccessService
from apps.server.domain.exceptions import (
    AccountAlreadyLinkedError,
    GameAccountNotFoundError,
    LinkSlotLimitError,
)
from apps.server.domain.gateways import GameAccount, GameCharacter, ILineageGateway
from apps.server.infrastructure.models import ManagedLineageAccount
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class AccountActor:
    user_id: UUID
    username: str
    email: str


class ListAccessibleAccountsUseCase(UseCase[AccountActor, list[AccessibleAccount]]):
    def __init__(self, access: IAccountAccessService) -> None:
        self._access = access

    def execute(self, data: AccountActor) -> list[AccessibleAccount]:
        return self._access.list_accounts(data.user_id, data.username)


class GetLinkSlotsUseCase(UseCase[AccountActor, dict]):
    def __init__(self, access: IAccountAccessService) -> None:
        self._access = access

    def execute(self, data: AccountActor) -> dict:
        used, total = self._access.slot_usage(data.user_id, data.username)
        return {"used": used, "total": total, "can_link": used < total}


@dataclass(frozen=True, slots=True)
class RegisterGameAccountInput:
    actor: AccountActor
    password: str


class RegisterGameAccountUseCase(UseCase[RegisterGameAccountInput, GameAccount]):
    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._unit_of_work = unit_of_work

    def execute(self, data: RegisterGameAccountInput) -> GameAccount:
        login = data.actor.username
        existing = self._lineage.get_account(login)
        if existing is None:
            account = self._lineage.register_account(login, data.password, data.actor.email)
        else:
            account = existing
        if account.linked_user_id and account.linked_user_id != str(data.actor.user_id):
            raise AccountAlreadyLinkedError()
        with self._unit_of_work:
            linked = self._lineage.link_account(login, str(data.actor.user_id))
            self._remember(data.actor.user_id, login, primary=True)
        return linked

    def _remember(self, user_id: UUID, login: str, *, primary: bool) -> None:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=user_id)
        ManagedLineageAccount.objects.update_or_create(
            user=user,
            login=login,
            defaults={"is_primary": primary},
        )


@dataclass(frozen=True, slots=True)
class LinkGameAccountInput:
    actor: AccountActor
    login: str
    password: str


class LinkGameAccountUseCase(UseCase[LinkGameAccountInput, GameAccount]):
    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._unit_of_work = unit_of_work

    def execute(self, data: LinkGameAccountInput) -> GameAccount:
        login = data.login.strip()
        if not self._lineage.validate_credentials(login, data.password):
            raise ValidationDomainError("Login ou senha da conta Lineage inválidos.")
        account = self._lineage.get_account(login)
        if account is None:
            raise GameAccountNotFoundError()
        if account.linked_user_id:
            raise AccountAlreadyLinkedError()
        if login.lower() != data.actor.username.lower() and not self._access.can_link_more(
            data.actor.user_id, data.actor.username
        ):
            raise LinkSlotLimitError()
        with self._unit_of_work:
            linked = self._lineage.link_account(login, str(data.actor.user_id))
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.get(id=data.actor.user_id)
            ManagedLineageAccount.objects.update_or_create(
                user=user,
                login=login,
                defaults={"is_primary": login.lower() == data.actor.username.lower()},
            )
        return linked


@dataclass(frozen=True, slots=True)
class UnlinkGameAccountInput:
    actor: AccountActor
    login: str


class UnlinkGameAccountUseCase(UseCase[UnlinkGameAccountInput, None]):
    def __init__(self, lineage: ILineageGateway, unit_of_work: UnitOfWork) -> None:
        self._lineage = lineage
        self._unit_of_work = unit_of_work

    def execute(self, data: UnlinkGameAccountInput) -> None:
        if data.login.lower() == data.actor.username.lower():
            raise ValidationDomainError("Não é possível desvincular a conta principal.")
        with self._unit_of_work:
            self._lineage.unlink_account(data.login, str(data.actor.user_id))
            ManagedLineageAccount.objects.filter(user__id=data.actor.user_id, login__iexact=data.login).delete()


@dataclass(frozen=True, slots=True)
class ListCharactersInput:
    actor: AccountActor
    login: str


class ListCharactersUseCase(UseCase[ListCharactersInput, list[GameCharacter]]):
    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: ListCharactersInput) -> list[GameCharacter]:
        login = data.login or data.actor.username
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError("Você não tem acesso a esta conta Lineage.")
        return self._lineage.list_characters(login)


@dataclass(frozen=True, slots=True)
class GetCharacterInput:
    actor: AccountActor
    login: str
    char_id: int


class GetCharacterUseCase(UseCase[GetCharacterInput, GameCharacter]):
    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: GetCharacterInput) -> GameCharacter:
        login = data.login or data.actor.username
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError("Você não tem acesso a esta conta Lineage.")
        char = self._lineage.get_character(login, data.char_id)
        if char is None:
            raise GameAccountNotFoundError("Personagem não encontrado nesta conta.")
        return char


@dataclass(frozen=True, slots=True)
class UpdateGamePasswordInput:
    actor: AccountActor
    login: str
    password: str


class UpdateGamePasswordUseCase(UseCase[UpdateGamePasswordInput, None]):
    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: UpdateGamePasswordInput) -> None:
        login = data.login or data.actor.username
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError()
        if len(data.password) < 6:
            raise ValidationDomainError("A senha precisa ter ao menos 6 caracteres.")
        self._lineage.update_account_password(login, data.password)


LINK_BY_EMAIL_SALT = "pdl-link-l2-email"
LINK_BY_EMAIL_MAX_AGE = 3600


@dataclass(frozen=True, slots=True)
class RequestLinkByEmailInput:
    actor: AccountActor
    email: str


class RequestLinkByEmailUseCase(UseCase[RequestLinkByEmailInput, dict]):
    def __init__(self, lineage: ILineageGateway, mailer: IMailer) -> None:
        self._lineage = lineage
        self._mailer = mailer

    def execute(self, data: RequestLinkByEmailInput) -> dict:
        from django.conf import settings
        from django.core import signing

        email = data.email.strip().lower()
        if not email:
            raise ValidationDomainError("Informe um e-mail.")
        account = next((row for row in self._lineage.find_accounts_by_email(email) if not row.linked_user_id), None)
        if account is None:
            raise ValidationDomainError("Nenhuma conta não vinculada foi encontrada com esse e-mail.")
        token = signing.dumps({"login": account.login, "email": email}, salt=LINK_BY_EMAIL_SALT)
        base = getattr(settings, "FRONTEND_URL", "") or getattr(settings, "PROJECT_URL", "http://localhost:3000")
        link = f"{base.rstrip('/')}/accounts?link_token={token}"
        self._mailer.send(
            email,
            "Vinculação de conta Lineage",
            f"Clique no link para vincular a conta {account.login} ao PDL PRO:\n\n{link}\n\nO link expira em 1 hora.",
        )
        return {"sent": True}


@dataclass(frozen=True, slots=True)
class ConfirmLinkByEmailInput:
    actor: AccountActor
    token: str


class ConfirmLinkByEmailUseCase(UseCase[ConfirmLinkByEmailInput, GameAccount]):
    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._unit_of_work = unit_of_work

    def execute(self, data: ConfirmLinkByEmailInput) -> GameAccount:
        from django.core import signing

        try:
            payload = signing.loads(data.token, salt=LINK_BY_EMAIL_SALT, max_age=LINK_BY_EMAIL_MAX_AGE)
        except signing.BadSignature as exc:
            raise ValidationDomainError("Link de vinculação inválido ou expirado.") from exc
        login = str(payload.get("login") or "")
        email = str(payload.get("email") or "")
        account = self._lineage.get_account_by_login_and_email(login, email)
        if account is None:
            raise GameAccountNotFoundError()
        if account.linked_user_id:
            raise AccountAlreadyLinkedError()
        if login.lower() != data.actor.username.lower() and not self._access.can_link_more(
            data.actor.user_id, data.actor.username
        ):
            raise LinkSlotLimitError()
        with self._unit_of_work:
            linked = self._lineage.link_account(login, str(data.actor.user_id))
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.get(id=data.actor.user_id)
            ManagedLineageAccount.objects.update_or_create(
                user=user,
                login=login,
                defaults={"is_primary": login.lower() == data.actor.username.lower()},
            )
        return linked
