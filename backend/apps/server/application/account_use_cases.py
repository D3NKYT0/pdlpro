from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.accounts.domain.mailer import IMailer
from apps.server.domain.access import AccessibleAccount, IAccountAccessService, PrimaryLoginState, same_linked_user
from apps.server.domain.exceptions import (
    AccountAlreadyLinkedError,
    GameAccountAlreadyExistsError,
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


class InspectPrimaryLoginUseCase(UseCase[AccountActor, PrimaryLoginState]):
    def __init__(self, lineage: ILineageGateway) -> None:
        self._lineage = lineage

    def execute(self, data: AccountActor) -> PrimaryLoginState:
        login = data.username
        account = self._lineage.get_account(login)
        if account and same_linked_user(account.linked_user_id, data.user_id):
            _remember_managed(data.user_id, login, primary=True)
            return PrimaryLoginState(login=login, status="owned")
        if account is None:
            return PrimaryLoginState(login=login, status="available")
        if account.linked_user_id:
            _promote_existing_primary(data.user_id)
            return PrimaryLoginState(login=login, status="taken")
        return PrimaryLoginState(login=login, status="unclaimed")


@dataclass(frozen=True, slots=True)
class RegisterGameAccountInput:
    actor: AccountActor
    password: str
    login: str = ""


class RegisterGameAccountUseCase(UseCase[RegisterGameAccountInput, GameAccount]):
    def __init__(
        self,
        lineage: ILineageGateway,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._lineage = lineage
        self._unit_of_work = unit_of_work

    def execute(self, data: RegisterGameAccountInput) -> GameAccount:
        if _has_primary(data.actor.user_id):
            raise ValidationDomainError("Você já possui uma conta principal.")
        preferred = data.actor.username
        custom = (data.login or "").strip()
        if custom.lower() == preferred.lower():
            custom = ""
        preferred_account = self._lineage.get_account(preferred)
        preferred_taken = bool(
            preferred_account
            and preferred_account.linked_user_id
            and not same_linked_user(preferred_account.linked_user_id, data.actor.user_id)
        )
        if preferred_taken:
            if not custom:
                raise AccountAlreadyLinkedError(
                    f"O login {preferred} já está vinculado a outro painel. "
                    "Crie a conta com outro login ou vincule uma conta existente."
                )
            if self._lineage.get_account(custom) is not None:
                raise GameAccountAlreadyExistsError()
            login = custom
            account = self._lineage.register_account(login, data.password, data.actor.email)
        else:
            login = preferred
            if preferred_account is None:
                account = self._lineage.register_account(login, data.password, data.actor.email)
            elif same_linked_user(preferred_account.linked_user_id, data.actor.user_id):
                account = preferred_account
            else:
                if not self._lineage.validate_credentials(login, data.password):
                    raise ValidationDomainError("Login ou senha da conta Lineage inválidos.")
                account = preferred_account
        with self._unit_of_work:
            if not same_linked_user(account.linked_user_id, data.actor.user_id):
                account = self._lineage.link_account(login, str(data.actor.user_id))
            _remember_managed(data.actor.user_id, login, primary=True)
        return account


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
        already_ours = same_linked_user(account.linked_user_id, data.actor.user_id)
        if account.linked_user_id and not already_ours:
            raise AccountAlreadyLinkedError()
        is_preferred = login.lower() == data.actor.username.lower()
        if not is_preferred and not already_ours and not self._access.can_link_more(
            data.actor.user_id, data.actor.username
        ):
            raise LinkSlotLimitError()
        with self._unit_of_work:
            if not already_ours:
                account = self._lineage.link_account(login, str(data.actor.user_id))
            _remember_managed(
                data.actor.user_id,
                login,
                primary=is_preferred or not _has_primary(data.actor.user_id),
            )
        return account


@dataclass(frozen=True, slots=True)
class UnlinkGameAccountInput:
    actor: AccountActor
    login: str


class UnlinkGameAccountUseCase(UseCase[UnlinkGameAccountInput, None]):
    def __init__(self, lineage: ILineageGateway, unit_of_work: UnitOfWork) -> None:
        self._lineage = lineage
        self._unit_of_work = unit_of_work

    def execute(self, data: UnlinkGameAccountInput) -> None:
        managed = ManagedLineageAccount.objects.filter(
            user__id=data.actor.user_id, login__iexact=data.login
        ).first()
        if (managed and managed.is_primary) or data.login.lower() == data.actor.username.lower():
            raise ValidationDomainError("Não é possível desvincular a conta principal.")
        with self._unit_of_work:
            self._lineage.unlink_account(data.login, str(data.actor.user_id))
            ManagedLineageAccount.objects.filter(user__id=data.actor.user_id, login__iexact=data.login).delete()


class InspectGameAccountUseCase(UseCase[str, dict]):
    def __init__(self, lineage: ILineageGateway) -> None:
        self._lineage = lineage

    def execute(self, data: str) -> dict:
        return _staff_account_snapshot(self._lineage, _require_login(data))


class ForceUnlinkGameAccountUseCase(UseCase[str, dict]):
    def __init__(self, lineage: ILineageGateway, unit_of_work: UnitOfWork) -> None:
        self._lineage = lineage
        self._unit_of_work = unit_of_work

    def execute(self, data: str) -> dict:
        login = _require_login(data)
        account = self._lineage.get_account(login)
        if account is None:
            raise GameAccountNotFoundError()
        with self._unit_of_work:
            self._lineage.clear_account_link(login)
            ManagedLineageAccount.objects.filter(login__iexact=login).delete()
        return _staff_account_snapshot(self._lineage, login)


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
        already_ours = same_linked_user(account.linked_user_id, data.actor.user_id)
        if account.linked_user_id and not already_ours:
            raise AccountAlreadyLinkedError()
        is_preferred = login.lower() == data.actor.username.lower()
        if not is_preferred and not already_ours and not self._access.can_link_more(
            data.actor.user_id, data.actor.username
        ):
            raise LinkSlotLimitError()
        with self._unit_of_work:
            if not already_ours:
                account = self._lineage.link_account(login, str(data.actor.user_id))
            _remember_managed(
                data.actor.user_id,
                login,
                primary=is_preferred or not _has_primary(data.actor.user_id),
            )
        return account


def _has_primary(user_id: UUID) -> bool:
    return ManagedLineageAccount.objects.filter(user__id=user_id, is_primary=True).exists()


def _promote_existing_primary(user_id: UUID) -> None:
    if _has_primary(user_id):
        return
    extra = ManagedLineageAccount.objects.filter(user__id=user_id).order_by("created_at").first()
    if extra is None:
        return
    extra.is_primary = True
    extra.save(update_fields=["is_primary"])


def _remember_managed(user_id: UUID, login: str, *, primary: bool) -> None:
    from django.contrib.auth import get_user_model

    user = get_user_model().objects.get(id=user_id)
    if primary:
        ManagedLineageAccount.objects.filter(user=user, is_primary=True).exclude(login__iexact=login).update(
            is_primary=False
        )
    ManagedLineageAccount.objects.update_or_create(
        user=user,
        login=login,
        defaults={"is_primary": primary},
    )


def _require_login(login: str) -> str:
    value = (login or "").strip()
    if not value:
        raise ValidationDomainError("Informe o login da conta Lineage.")
    return value


def _staff_account_snapshot(lineage: ILineageGateway, login: str) -> dict:
    account = lineage.get_account((login or "").strip())
    if account is None:
        raise GameAccountNotFoundError()
    return {
        "login": account.login,
        "email": account.email,
        "linked": bool(account.linked_user_id),
        "linked_user_id": account.linked_user_id,
        "panel_username": _panel_username(account.linked_user_id),
    }


def _panel_username(linked_user_id: str | None) -> str | None:
    if not linked_user_id:
        return None
    from django.contrib.auth import get_user_model

    compact = str(linked_user_id).replace("-", "").strip()
    if len(compact) != 32:
        return None
    try:
        uid = UUID(compact)
    except ValueError:
        return None
    user = get_user_model().objects.filter(id=uid).first()
    return user.username if user else None
