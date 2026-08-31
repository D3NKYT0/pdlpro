from __future__ import annotations

from uuid import UUID

from apps.clans.domain.entities import ClanApplicationEntity, ClanEntity
from apps.clans.domain.repositories import IClanApplicationRepository, IClanRepository
from apps.clans.infrastructure.models import ClanApplication, ClanProfile


class DjangoClanRepository(IClanRepository):
    def _entity(self, row: ClanProfile) -> ClanEntity:
        return ClanEntity(
            id=row.id,
            name=row.name,
            description=row.description,
            recruiting=row.recruiting,
            owner_id=row.owner.id,
            owner_username=row.owner.username,
            motd=row.motd,
            focus=row.focus,
            min_level=row.min_level,
            clan_id=row.clan_id,
        )

    def get_by_id(self, clan_id: UUID) -> ClanEntity | None:
        row = ClanProfile.objects.select_related("owner").filter(id=clan_id).first()
        return self._entity(row) if row else None

    def name_exists(self, name: str) -> bool:
        return ClanProfile.objects.filter(name__iexact=name).exists()

    def list_public(self) -> list[ClanEntity]:
        rows = ClanProfile.objects.select_related("owner").order_by("-recruiting", "name")
        return [self._entity(row) for row in rows]

    def create(
        self,
        *,
        owner_id: UUID,
        name: str,
        description: str,
        motd: str,
        focus: str,
        min_level: int,
        recruiting: bool,
        clan_id: int | None,
    ) -> ClanEntity:
        from django.contrib.auth import get_user_model

        owner = get_user_model().objects.get(id=owner_id)
        row = ClanProfile.objects.create(
            owner=owner,
            name=name,
            description=description,
            motd=motd,
            focus=focus,
            min_level=min_level,
            recruiting=recruiting,
            clan_id=clan_id,
        )
        return self._entity(row)


class DjangoClanApplicationRepository(IClanApplicationRepository):
    def _entity(self, row: ClanApplication) -> ClanApplicationEntity:
        return ClanApplicationEntity(
            id=row.id,
            clan_id=row.clan.id,
            clan_name=row.clan.name,
            user_id=row.user.id,
            username=row.user.username,
            char_name=row.char_name,
            message=row.message,
            status=row.status,
        )

    def get_by_id(self, application_id: UUID) -> ClanApplicationEntity | None:
        row = ClanApplication.objects.select_related("clan", "user").filter(id=application_id).first()
        return self._entity(row) if row else None

    def exists_pending(self, clan_id: UUID, user_id: UUID) -> bool:
        return ClanApplication.objects.filter(clan__id=clan_id, user__id=user_id).exists()

    def create(
        self,
        *,
        clan_id: UUID,
        user_id: UUID,
        char_name: str,
        message: str,
    ) -> ClanApplicationEntity:
        from django.contrib.auth import get_user_model

        clan = ClanProfile.objects.get(id=clan_id)
        user = get_user_model().objects.get(id=user_id)
        row = ClanApplication.objects.create(clan=clan, user=user, char_name=char_name, message=message)
        return self._entity(row)

    def list_for_user(self, user_id: UUID) -> list[ClanApplicationEntity]:
        rows = ClanApplication.objects.select_related("clan", "user").filter(user__id=user_id)
        return [self._entity(row) for row in rows]

    def list_for_clan(self, clan_id: UUID) -> list[ClanApplicationEntity]:
        rows = ClanApplication.objects.select_related("clan", "user").filter(clan__id=clan_id)
        return [self._entity(row) for row in rows]

    def review(self, application_id: UUID, *, status: str) -> ClanApplicationEntity | None:
        row = ClanApplication.objects.select_related("clan", "user").filter(id=application_id).first()
        if row is None:
            return None
        row.status = status
        row.save(update_fields=["status", "updated_at"])
        return self._entity(row)
