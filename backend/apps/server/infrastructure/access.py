from __future__ import annotations

from uuid import UUID

from django.conf import settings

from apps.server.domain.access import AccessibleAccount, IAccountAccessService, same_linked_user
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.repositories import ILinkSlotRepository
from apps.server.infrastructure.models import ManagedLineageAccount


class DjangoAccountAccessService(IAccountAccessService):
    def __init__(self, lineage: ILineageGateway, slots: ILinkSlotRepository) -> None:
        self._lineage = lineage
        self._slots = slots

    def can_access(self, user_id: UUID, username: str, login: str) -> bool:
        if ManagedLineageAccount.objects.filter(user__id=user_id, login__iexact=login).exists():
            return True
        account = self._lineage.get_account(login)
        if account and same_linked_user(account.linked_user_id, user_id):
            return True
        if login.lower() != username.lower():
            return False
        return account is None or not account.linked_user_id or same_linked_user(account.linked_user_id, user_id)

    def list_accounts(self, user_id: UUID, username: str) -> list[AccessibleAccount]:
        seen: dict[str, AccessibleAccount] = {}
        for row in ManagedLineageAccount.objects.filter(user__id=user_id).order_by("-is_primary", "login"):
            seen[row.login.lower()] = AccessibleAccount(
                login=row.login,
                is_primary=row.is_primary,
                linked=True,
            )
        return list(seen.values())

    def can_link_more(self, user_id: UUID, username: str) -> bool:
        used, total = self.slot_usage(user_id, username)
        return used < total

    def slot_usage(self, user_id: UUID, username: str) -> tuple[int, int]:
        used = ManagedLineageAccount.objects.filter(user__id=user_id, is_primary=False).count()
        free = int(getattr(settings, "ACCOUNT_LINK_FREE_SLOTS", 3))
        extra = self._slots.extra_slots(user_id)
        return used, free + extra
