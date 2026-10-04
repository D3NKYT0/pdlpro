"""Integra papéis PDL ao contrato de permissões nativo do Django/Jazzmin."""

from django.contrib.auth.backends import ModelBackend

from apps.accounts.domain.access import (
    CAPABILITIES,
    ROLE_CAPABILITIES,
    ROLE_GROUP_PREFIX,
    capability_permission,
    role_permissions,
)


def effective_roles(user) -> list[str]:
    """Combina papel principal e grupos de papéis, preservando grupos comuns."""
    roles = {user.role}
    if user.pk:
        roles.update(name.removeprefix(ROLE_GROUP_PREFIX) for name in user.groups.values_list("name", flat=True)
                     if name.startswith(ROLE_GROUP_PREFIX))
    return sorted(role for role in roles if role in ROLE_CAPABILITIES)


def effective_capabilities(user) -> list[str]:
    """Capacidades da conta ativa para o contrato de sessão da SPA."""
    if not user.is_active:
        return []
    permissions = user.get_all_permissions() if user.pk else role_permissions([user.role])
    return sorted(capability for capability in CAPABILITIES
                  if user.is_superuser or capability_permission(capability) in permissions)


class RolePermissionBackend(ModelBackend):
    """Acrescenta templates aos grants nativos, sem transformar is_staff em privilégio.

    Permissões de objeto não são inferidas dos grants globais. A propriedade dos
    registros continua nos casos de uso. O cache nativo dura somente a instância
    do usuário/requisição; revogações são observadas na próxima autenticação.
    """

    def get_group_permissions(self, user_obj, obj=None):
        if not user_obj.is_active or user_obj.is_anonymous or obj is not None:
            return set()
        return super().get_group_permissions(user_obj, obj) | role_permissions(effective_roles(user_obj))
