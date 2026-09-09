from __future__ import annotations

from apps.accounts.domain.exceptions import ComingSoonLoginRestrictedError
from apps.server.domain.repositories import IIndexConfigRepository


def _resolve_index_config(index_config: IIndexConfigRepository | None) -> IIndexConfigRepository:
    if index_config is not None:
        return index_config
    from common.di.bootstrap import DependencyInjection

    return DependencyInjection.root().create_scope().resolve(IIndexConfigRepository)


def assert_login_allowed_during_coming_soon(
    user,
    index_config: IIndexConfigRepository | None = None,
) -> None:
    """Bloqueia login de visitantes comuns quando Coming Soon restringe o acesso à staff.

    Aceita entidade de domínio ou modelo ORM. Staff, superusuário e membros de staff do painel
    seguem autorizados. Sem configuração ativa, ou com Coming Soon desligado, não interfere.
    """

    row = _resolve_index_config(index_config).get_active()
    if row is None or not row.coming_soon or not row.staff_only_login:
        return
    if bool(
        getattr(user, "is_staff", False)
        or getattr(user, "is_superuser", False)
        or getattr(user, "is_staff_member", False)
    ):
        return
    raise ComingSoonLoginRestrictedError()
