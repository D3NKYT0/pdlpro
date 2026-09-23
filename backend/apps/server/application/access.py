from __future__ import annotations

from apps.accounts.domain.exceptions import (
    ComingSoonLoginRestrictedError,
    ComingSoonRegistrationRestrictedError,
)
from apps.server.domain.exceptions import ComingSoonL2RegistrationRestrictedError
from apps.server.domain.repositories import IIndexConfigRepository


def _is_staff_user(user) -> bool:
    return bool(
        getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "is_staff_member", False)
    )


def _active_coming_soon(index_config: IIndexConfigRepository):
    row = index_config.get_active()
    if row is None or not row.coming_soon:
        return None
    return row


def assert_registration_allowed(index_config: IIndexConfigRepository) -> None:
    """Bloqueia cadastro público quando Coming Soon desliga a criação de contas no site."""

    row = _active_coming_soon(index_config)
    if row is None or bool(getattr(row, "allow_registration", True)):
        return
    raise ComingSoonRegistrationRestrictedError()


def assert_login_allowed_during_coming_soon(
    user,
    index_config: IIndexConfigRepository,
) -> None:
    """Bloqueia login de visitantes comuns quando Coming Soon restringe o acesso à staff.

    Aceita entidade de domínio ou modelo ORM. Staff, superusuário e membros de staff do painel
    seguem autorizados. Sem configuração ativa, ou com Coming Soon desligado, não interfere.
    """

    row = _active_coming_soon(index_config)
    if row is None or not row.staff_only_login:
        return
    if _is_staff_user(user):
        return
    raise ComingSoonLoginRestrictedError()


def assert_l2_registration_allowed(
    user,
    index_config: IIndexConfigRepository,
) -> None:
    """Bloqueia criação de conta Lineage para jogadores quando Coming Soon fecha o cadastro L2.

    Staff permanece autorizada para testes. Sem Coming Soon ativo, não interfere.
    """

    row = _active_coming_soon(index_config)
    if row is None or bool(getattr(row, "allow_l2_registration", True)):
        return
    if _is_staff_user(user):
        return
    raise ComingSoonL2RegistrationRestrictedError()
