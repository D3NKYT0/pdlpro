from __future__ import annotations

from uuid import UUID

from django.conf import settings

from apps.server.domain.access import (
    AccessibleAccount,
    IAccountAccessService,
    same_linked_user,
)
from apps.server.domain.gateways import ILineageGateway
from apps.server.domain.repositories import ILinkSlotRepository
from apps.server.infrastructure.models import ManagedLineageAccount


class DjangoAccountAccessService(IAccountAccessService):
    """Consulta vínculos Lineage e limites locais para autorizar acesso a contas.

    Injete pela porta IAccountAccessService. Use ``can_access`` antes de operar uma conta e
    ``can_link_more`` antes de adicionar vínculo secundário. ``list_accounts`` e ``slot_usage``
    alimentam a seleção de contas na UI.
    """

    def __init__(self, lineage: ILineageGateway, slots: ILinkSlotRepository) -> None:
        self._lineage = lineage
        self._slots = slots

    def can_access(self, user_id: UUID, username: str, login: str) -> bool:
        account = self._lineage.get_account(login)
        # A referência local e a coincidência de nomes não comprovam propriedade.
        return bool(account and same_linked_user(account.linked_user_id, user_id))

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
