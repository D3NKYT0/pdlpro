"""Delegação de acesso com trava, revisão otimista e histórico nativo do Django."""

import hashlib
import json

from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q

from apps.accounts.domain.access import (
    CAPABILITIES,
    ROLE_CAPABILITIES,
    ROLE_GROUP_PREFIX,
    capability_permission,
)
from apps.accounts.domain.access_management import IAccessManagementStore
from apps.accounts.infrastructure.models import User
from common.architecture.exceptions import (
    AuthorizationError,
    ConflictError,
    EntityNotFoundError,
)


class DjangoAccessManagementStore(IAccessManagementStore):
    """Preserva grupos comuns/permissões individuais e impede alterações de superusuários."""

    def catalog(self):
        """Une templates estáticos e exceções administrativas de cada grupo reservado."""
        roles = {}
        for role, capabilities in ROLE_CAPABILITIES.items():
            grants = set(Permission.objects.filter(group__name=ROLE_GROUP_PREFIX + role)
                         .values_list("codename", "content_type__app_label"))
            roles[role] = sorted(set(capabilities) | {c for c in CAPABILITIES
                if (capability_permission(c).split(".")[1], "accounts") in grants})
        return {"roles": {role: sorted(caps) for role, caps in ROLE_CAPABILITIES.items()},
                "additional_role_capabilities": roles}

    def _snapshot(self, user):
        grants = sorted(f"{p.content_type.app_label}.{p.codename}" for p in Permission.objects.filter(
            Q(user=user) | Q(group__user=user)).select_related("content_type").distinct())
        known_groups = [ROLE_GROUP_PREFIX + r for r in ROLE_CAPABILITIES]
        external = sorted(f"{p.content_type.app_label}.{p.codename}" for p in Permission.objects.filter(
            Q(user=user) | Q(group__in=user.groups.exclude(name__in=known_groups)))
            .select_related("content_type").distinct())
        state = {
            "id": str(user.id), "username": user.username, "role": user.role,
            "additional_roles": sorted(name.removeprefix(ROLE_GROUP_PREFIX) for name in
                user.groups.values_list("name", flat=True) if name.startswith(ROLE_GROUP_PREFIX)
                and name.removeprefix(ROLE_GROUP_PREFIX) in ROLE_CAPABILITIES),
            "is_staff": user.is_staff, "is_superuser": user.is_superuser,
            "capabilities": user.capabilities,
            "extra_capabilities": sorted(c for c in CAPABILITIES if capability_permission(c) in external),
            "explicit_permissions": external,
            "other_groups": sorted(user.groups.exclude(name__startswith=ROLE_GROUP_PREFIX).values_list("name", flat=True)),
        }
        state["revision"] = hashlib.sha256(json.dumps([state, grants], sort_keys=True).encode()).hexdigest()
        return state

    def _user(self, user_id, lock=False):
        rows = User.objects.select_for_update() if lock else User.objects
        try:
            return rows.get(id=user_id)
        except User.DoesNotExist as exc:
            raise EntityNotFoundError() from exc

    def get(self, user_id):
        return self._snapshot(self._user(user_id))

    def update(self, actor_id, user_id, role, additional_roles, is_staff, revision):
        with transaction.atomic():
            actor = self._user(actor_id, lock=True)
            user = self._user(user_id, lock=True)
            if not actor.is_active or not actor.is_superuser or user.is_superuser or actor_id == user_id:
                raise AuthorizationError()
            before = self._snapshot(user)
            if before["revision"] != revision:
                raise ConflictError()
            if (before["role"] == role and before["additional_roles"] == sorted(additional_roles)
                    and before["is_staff"] == is_staff):
                return before
            user.role, user.is_staff = role, is_staff
            user.save(update_fields=["role", "is_staff", "updated_at"])
            # Só grupos reservados conhecidos pertencem a esta operação.
            groups = Group.objects.filter(name__in=[ROLE_GROUP_PREFIX + r for r in ROLE_CAPABILITIES])
            user.groups.remove(*groups)
            for slug in additional_roles:
                group, _ = Group.objects.get_or_create(name=ROLE_GROUP_PREFIX + slug)
                user.groups.add(group)
            after = self._snapshot(self._user(user_id))
            LogEntry.objects.create(user=actor, content_type=ContentType.objects.get_for_model(User),
                object_id=str(user.pk), object_repr=user.username, action_flag=CHANGE,
                change_message=json.dumps({"operation": "access_roles", "before": before, "after": after}))
            return after
