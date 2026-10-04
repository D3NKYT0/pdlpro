"""Autoriza consultas administrativas e trocas de identidade sem depender de HTTP ou ORM."""

from uuid import UUID

from apps.accounts.domain.impersonation import IImpersonationStore
from apps.accounts.domain.repositories import IUserRepository
from common.architecture.exceptions import (
    AuthorizationError,
    EntityNotFoundError,
    ValidationDomainError,
)


class ImpersonationService:
    """Lista contas e inicia/encerra um acesso temporário autorizado por prova de sessão."""

    def __init__(self, users: IUserRepository, sessions: IImpersonationStore):
        self.users = users
        self.sessions = sessions

    def authorize(self, actor_id: UUID):
        actor = self.users.get_by_id(actor_id)
        if not actor or not actor.is_active or not actor.is_superuser:
            raise AuthorizationError()
        return actor

    def list_users(self, actor_id: UUID, search: str, page: int):
        self.authorize(actor_id)
        if not 1 <= page <= 1_000_000 or len(search) > 100:
            raise ValidationDomainError()
        return self.sessions.list_users(search, page)

    def start(self, actor_id: UUID, target_id: UUID, original_jti: str):
        self.authorize(actor_id)
        target = self.users.get_by_id(target_id)
        if target is None:
            raise EntityNotFoundError()
        if (
            not target.is_active
            or target.is_staff_member
            or target.is_superuser
            or target.role not in ("player", "supporter")
        ):
            raise AuthorizationError()
        return self.sessions.start(actor_id, target_id, original_jti)

    def status(self, session_id: str):
        return self.sessions.status(session_id)

    def finish(self, session_id: str):
        return self.sessions.finish(session_id)
