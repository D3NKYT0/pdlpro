from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from django.utils.translation import gettext as _

from apps.accounts.domain.mailer import IMailer
from apps.accounts.domain.repositories import IUserRepository
from apps.server.domain.access import (
    AccessibleAccount,
    IAccountAccessService,
    PrimaryLoginState,
    same_linked_user,
)
from apps.server.domain.exceptions import (
    AccountAlreadyLinkedError,
    GameAccountAlreadyExistsError,
    GameAccountNotFoundError,
    LinkSlotLimitError,
)
from apps.server.domain.gateways import (
    GameAccount,
    GameCharacter,
    GameSkill,
    ILineageGateway,
)
from apps.server.domain.repositories import IManagedLineageAccountRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError
from common.i18n import activate_language


@dataclass(frozen=True, slots=True)
class AccountActor:
    """Contexto do usuário do painel usado nas operações de contas Lineage.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    username: str
    email: str


class ListAccessibleAccountsUseCase(UseCase[AccountActor, list[AccessibleAccount]]):
    """Lista contas Lineage acessíveis ao usuário por meio da política de vínculos.

    Uso: resolva pelo container e chame ``execute(data)`` com ``AccountActor``. O retorno é
    ``list[AccessibleAccount]``.
    """

    def __init__(self, access: IAccountAccessService) -> None:
        self._access = access

    def execute(self, data: AccountActor) -> list[AccessibleAccount]:
        return self._access.list_accounts(data.user_id, data.username)


class GetLinkSlotsUseCase(UseCase[AccountActor, dict]):
    """Retorna slots usados, limite total e indicação de que ainda é possível vincular outra conta.

    Uso: resolva pelo container e chame ``execute(data)`` com ``AccountActor``. O retorno é
    ``dict``.
    """

    def __init__(self, access: IAccountAccessService) -> None:
        self._access = access

    def execute(self, data: AccountActor) -> dict:
        used, total = self._access.slot_usage(data.user_id, data.username)
        return {"used": used, "total": total, "can_link": used < total}


class InspectPrimaryLoginUseCase(UseCase[AccountActor, PrimaryLoginState]):
    """Classifica o login preferido como owned, available, taken ou unclaimed. Pode atualizar o
    registro local de conta principal durante a inspeção.

    Uso: resolva pelo container e chame ``execute(data)`` com ``AccountActor``. O retorno é
    ``PrimaryLoginState``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        managed_accounts: IManagedLineageAccountRepository,
    ) -> None:
        self._lineage = lineage
        self._managed = managed_accounts

    def execute(self, data: AccountActor) -> PrimaryLoginState:
        login = data.username
        account = self._lineage.get_account(login)
        if account and same_linked_user(account.linked_user_id, data.user_id):
            self._managed.remember(data.user_id, login, primary=True)
            return PrimaryLoginState(login=login, status="owned")
        if account is None:
            return PrimaryLoginState(login=login, status="available")
        if account.linked_user_id:
            self._managed.promote_oldest_as_primary(data.user_id)
            return PrimaryLoginState(login=login, status="taken")
        return PrimaryLoginState(login=login, status="unclaimed")


@dataclass(frozen=True, slots=True)
class RegisterGameAccountInput:
    """Dados de entrada de ``RegisterGameAccountUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    password: str
    login: str = ""


class RegisterGameAccountUseCase(UseCase[RegisterGameAccountInput, GameAccount]):
    """Cria ou assume a conta principal do jogo, verificando credenciais quando o login já existe
    sem vínculo. Registra o vínculo no Lineage e a referência local; essas gravações usam bancos
    distintos.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RegisterGameAccountInput``. O
    retorno é ``GameAccount``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        unit_of_work: UnitOfWork,
        managed_accounts: IManagedLineageAccountRepository,
    ) -> None:
        self._lineage = lineage
        self._unit_of_work = unit_of_work
        self._managed = managed_accounts

    def execute(self, data: RegisterGameAccountInput) -> GameAccount:
        if self._managed.has_primary(data.actor.user_id):
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
            self._managed.remember(data.actor.user_id, login, primary=True)
        return account


@dataclass(frozen=True, slots=True)
class LinkGameAccountInput:
    """Dados de entrada de ``LinkGameAccountUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    login: str
    password: str


class LinkGameAccountUseCase(UseCase[LinkGameAccountInput, GameAccount]):
    """Valida credenciais, conflito de proprietário e limite de slots antes de vincular uma conta
    Lineage ao usuário.

    Uso: resolva pelo container e chame ``execute(data)`` com ``LinkGameAccountInput``. O
    retorno é ``GameAccount``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        unit_of_work: UnitOfWork,
        managed_accounts: IManagedLineageAccountRepository,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._unit_of_work = unit_of_work
        self._managed = managed_accounts

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
            self._managed.remember(
                data.actor.user_id,
                login,
                primary=is_preferred or not self._managed.has_primary(data.actor.user_id),
            )
        return account


@dataclass(frozen=True, slots=True)
class UnlinkGameAccountInput:
    """Dados de entrada de ``UnlinkGameAccountUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    login: str


class UnlinkGameAccountUseCase(UseCase[UnlinkGameAccountInput, None]):
    """Remove o vínculo de uma conta secundária e sua referência local; impede desvincular a conta
    principal.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UnlinkGameAccountInput``. O
    retorno é ``None``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        unit_of_work: UnitOfWork,
        managed_accounts: IManagedLineageAccountRepository,
    ) -> None:
        self._lineage = lineage
        self._unit_of_work = unit_of_work
        self._managed = managed_accounts

    def execute(self, data: UnlinkGameAccountInput) -> None:
        managed = self._managed.find_for_user(data.actor.user_id, data.login)
        if (managed and managed.is_primary) or data.login.lower() == data.actor.username.lower():
            raise ValidationDomainError("Não é possível desvincular a conta principal.")
        with self._unit_of_work:
            self._lineage.unlink_account(data.login, str(data.actor.user_id))
            self._managed.delete_for_user(data.actor.user_id, data.login)


class InspectGameAccountUseCase(UseCase[str, dict]):
    """Produz uma visão administrativa de uma conta Lineage a partir do login. A view chamadora
    deve exigir permissão de staff.

    Uso: resolva pelo container e chame ``execute(data)`` com ``str``. O retorno é ``dict``.
    """

    def __init__(self, lineage: ILineageGateway, users: IUserRepository) -> None:
        self._lineage = lineage
        self._users = users

    def execute(self, data: str) -> dict:
        return _staff_account_snapshot(self._lineage, self._users, _require_login(data))


class ForceUnlinkGameAccountUseCase(UseCase[str, dict]):
    """Remove administrativamente o vínculo no Lineage e os registros locais e retorna a nova visão
    da conta. Exige autorização de staff na entrada HTTP.

    Uso: resolva pelo container e chame ``execute(data)`` com ``str``. O retorno é ``dict``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        unit_of_work: UnitOfWork,
        managed_accounts: IManagedLineageAccountRepository,
        users: IUserRepository,
    ) -> None:
        self._lineage = lineage
        self._unit_of_work = unit_of_work
        self._managed = managed_accounts
        self._users = users

    def execute(self, data: str) -> dict:
        login = _require_login(data)
        account = self._lineage.get_account(login)
        if account is None:
            raise GameAccountNotFoundError()
        with self._unit_of_work:
            self._lineage.clear_account_link(login)
            self._managed.delete_by_login(login)
        return _staff_account_snapshot(self._lineage, self._users, login)


@dataclass(frozen=True, slots=True)
class ListCharactersInput:
    """Dados de entrada de ``ListCharactersUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    login: str


class ListCharactersUseCase(UseCase[ListCharactersInput, list[GameCharacter]]):
    """Lista personagens de uma conta após verificar o acesso do usuário ao login informado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ListCharactersInput``. O retorno
    é ``list[GameCharacter]``.
    """

    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: ListCharactersInput) -> list[GameCharacter]:
        login = data.login or data.actor.username
        if self._lineage.get_account(login) is None:
            raise GameAccountNotFoundError()
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError("Você não tem acesso a esta conta Lineage.")
        return self._lineage.list_characters(login)


@dataclass(frozen=True, slots=True)
class GetCharacterInput:
    """Dados de entrada de ``GetCharacterUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    login: str
    char_id: int


class GetCharacterUseCase(UseCase[GetCharacterInput, GameCharacter]):
    """Consulta um personagem da conta autorizada e rejeita personagens ausentes naquele login.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetCharacterInput``. O retorno é
    ``GameCharacter``.
    """

    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: GetCharacterInput) -> GameCharacter:
        login = data.login or data.actor.username
        if self._lineage.get_account(login) is None:
            raise GameAccountNotFoundError()
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError("Você não tem acesso a esta conta Lineage.")
        char = self._lineage.get_character(login, data.char_id)
        if char is None:
            raise GameAccountNotFoundError("Personagem não encontrado nesta conta.")
        return char


class ListCharacterSkillsUseCase(UseCase[GetCharacterInput, list[GameSkill]]):
    """Lista as skills do personagem após confirmar acesso à conta e propriedade.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetCharacterInput``. O retorno
    é a lista de ``GameSkill`` do gateway.
    """

    def __init__(self, lineage: ILineageGateway, access: IAccountAccessService) -> None:
        self._lineage = lineage
        self._access = access

    def execute(self, data: GetCharacterInput) -> list[GameSkill]:
        login = data.login or data.actor.username
        if self._lineage.get_account(login) is None:
            raise GameAccountNotFoundError()
        if not self._access.can_access(data.actor.user_id, data.actor.username, login):
            raise AuthorizationError("Você não tem acesso a esta conta Lineage.")
        char = self._lineage.get_character(login, data.char_id)
        if char is None:
            raise GameAccountNotFoundError("Personagem não encontrado nesta conta.")
        return self._lineage.list_character_skills(data.char_id)


@dataclass(frozen=True, slots=True)
class UpdateGamePasswordInput:
    """Dados de entrada de ``UpdateGamePasswordUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    login: str
    password: str


class UpdateGamePasswordUseCase(UseCase[UpdateGamePasswordInput, None]):
    """Verifica acesso à conta e senha com pelo menos seis caracteres antes de alterar a senha no
    gateway.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateGamePasswordInput``. O
    retorno é ``None``.
    """

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
    """Dados de entrada de ``RequestLinkByEmailUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    email: str


class RequestLinkByEmailUseCase(UseCase[RequestLinkByEmailInput, dict]):
    """Busca uma conta ainda não vinculada pelo e-mail e envia um token assinado para confirmar o
    vínculo.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RequestLinkByEmailInput``. O
    retorno é ``dict``.
    """

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
        language = getattr(data.actor, "language", None) or getattr(data.actor, "preferred_language", None)
        if language:
            activate_language(language)
        self._mailer.send(
            email,
            _("Vinculação de conta Lineage"),
            _(
                "Clique no link para vincular a conta %(login)s ao PDL PRO:\n\n"
                "%(link)s\n\nO link expira em 1 hora."
            )
            % {"login": account.login, "link": link},
        )
        return {"sent": True}


@dataclass(frozen=True, slots=True)
class ConfirmLinkByEmailInput:
    """Dados de entrada de ``ConfirmLinkByEmailUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    actor: AccountActor
    token: str


class ConfirmLinkByEmailUseCase(UseCase[ConfirmLinkByEmailInput, GameAccount]):
    """Valida o token de e-mail, a conta e os slots disponíveis antes de salvar o vínculo e a
    referência local.

    Uso: resolva pelo container e chame ``execute(data)`` com ``ConfirmLinkByEmailInput``. O
    retorno é ``GameAccount``.
    """

    def __init__(
        self,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        unit_of_work: UnitOfWork,
        managed_accounts: IManagedLineageAccountRepository,
    ) -> None:
        self._lineage = lineage
        self._access = access
        self._unit_of_work = unit_of_work
        self._managed = managed_accounts

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
            self._managed.remember(
                data.actor.user_id,
                login,
                primary=is_preferred or not self._managed.has_primary(data.actor.user_id),
            )
        return account


def _require_login(login: str) -> str:
    value = (login or "").strip()
    if not value:
        raise ValidationDomainError("Informe o login da conta Lineage.")
    return value


def _staff_account_snapshot(lineage: ILineageGateway, users: IUserRepository, login: str) -> dict:
    account = lineage.get_account((login or "").strip())
    if account is None:
        raise GameAccountNotFoundError()
    return {
        "login": account.login,
        "email": account.email,
        "linked": bool(account.linked_user_id),
        "linked_user_id": account.linked_user_id,
        "panel_username": _panel_username(users, account.linked_user_id),
    }


def _panel_username(users: IUserRepository, linked_user_id: str | None) -> str | None:
    if not linked_user_id:
        return None
    compact = str(linked_user_id).replace("-", "").strip()
    if len(compact) != 32:
        return None
    try:
        uid = UUID(compact)
    except ValueError:
        return None
    user = users.get_by_id(uid)
    return user.username if user else None
