"""Gerenciamento de papéis reservado ao superadministrador da identidade real."""

from apps.accounts.domain.access import ROLE_CAPABILITIES
from apps.accounts.domain.access_management import IAccessManagementStore
from apps.accounts.domain.repositories import IUserRepository
from common.architecture.exceptions import AuthorizationError, ValidationDomainError


class AccessManagementService:
    """Autoriza leitura e delegação; a porta garante concorrência e auditoria atômicas."""

    def __init__(self, users: IUserRepository, store: IAccessManagementStore):
        self.users = users
        self.store = store

    def authorize(self, actor_id):
        actor = self.users.get_by_id(actor_id)
        if not actor or not actor.is_active or not actor.is_superuser:
            raise AuthorizationError()

    def get(self, actor_id, user_id):
        self.authorize(actor_id)
        return self.store.get(user_id)

    def catalog(self, actor_id):
        """Autoriza a consulta dos templates efetivos administrados no Jazzmin."""
        self.authorize(actor_id)
        return self.store.catalog()

    def update(self, actor_id, user_id, role, additional_roles, is_staff, revision):
        self.authorize(actor_id)
        if role not in ROLE_CAPABILITIES or any(r not in ROLE_CAPABILITIES for r in additional_roles):
            raise ValidationDomainError()
        if len(set(additional_roles)) != len(additional_roles):
            raise ValidationDomainError()
        if actor_id == user_id:
            raise AuthorizationError()
        return self.store.update(actor_id, user_id, role, additional_roles, is_staff, revision)
