from __future__ import annotations

from uuid import UUID

from django.utils import timezone

from apps.server.domain.moderation import (
    CharacterJail,
    ModerationLogEntry,
)
from apps.server.domain.repositories import IModerationStateRepository
from apps.server.infrastructure.moderation_models import (
    CharacterJailState,
    ModerationActionLog,
)


class DjangoModerationStateRepository(IModerationStateRepository):
    """Adaptador Django de prisão e histórico de moderação no banco do painel."""

    def get_jail(self, char_id: int) -> CharacterJail | None:
        row = CharacterJailState.objects.filter(char_id=char_id).first()
        return self._active_jail(row)

    def list_active_jails(self, *, offset: int, limit: int) -> list[CharacterJail]:
        self._expire_due()
        rows = CharacterJailState.objects.filter(jailed=True).order_by("-updated_at")[offset : offset + limit]
        return [item for row in rows if (item := self._to_jail(row))]

    def count_active_jails(self) -> int:
        self._expire_due()
        return CharacterJailState.objects.filter(jailed=True).count()

    def set_jail(
        self,
        *,
        char_id: int,
        login: str,
        char_name: str,
        jail_until,
        jail_reason: str,
    ) -> CharacterJail:
        row, _ = CharacterJailState.objects.update_or_create(
            char_id=char_id,
            defaults={
                "login": login,
                "char_name": char_name,
                "jailed": True,
                "jail_until": jail_until,
                "jail_reason": jail_reason,
            },
        )
        return self._to_jail(row)

    def clear_jail(self, char_id: int) -> None:
        CharacterJailState.objects.filter(char_id=char_id).update(jailed=False, jail_until=None, jail_reason="")

    def list_logs(self, char_id: int, *, limit: int = 20) -> list[ModerationLogEntry]:
        rows = ModerationActionLog.objects.filter(char_id=char_id).order_by("-created_at")[:limit]
        return [self._to_log(row) for row in rows]

    def add_log(
        self,
        *,
        actor_id: UUID,
        actor_username: str,
        action: str,
        char_id: int,
        char_name: str,
        login: str,
        reason: str,
        was_online: bool,
        details: dict | None = None,
    ) -> ModerationLogEntry:
        row = ModerationActionLog.objects.create(
            actor_id=self._actor_pk(actor_id),
            actor_username=actor_username,
            action=action,
            char_id=char_id,
            char_name=char_name,
            login=login,
            reason=reason,
            was_online=was_online,
            details=details or {},
        )
        return self._to_log(row)

    def _expire_due(self) -> None:
        CharacterJailState.objects.filter(jailed=True, jail_until__isnull=False, jail_until__lte=timezone.now()).update(
            jailed=False
        )

    def _active_jail(self, row: CharacterJailState | None) -> CharacterJail | None:
        if row is None or not row.jailed:
            return None
        if row.jail_until and row.jail_until <= timezone.now():
            row.jailed = False
            row.save(update_fields=["jailed", "updated_at"])
            return None
        return self._to_jail(row)

    @staticmethod
    def _to_jail(row: CharacterJailState) -> CharacterJail:
        return CharacterJail(
            char_id=row.char_id,
            login=row.login,
            char_name=row.char_name,
            jailed=row.jailed,
            jail_until=row.jail_until,
            jail_reason=row.jail_reason,
        )

    @staticmethod
    def _to_log(row: ModerationActionLog) -> ModerationLogEntry:
        created = row.created_at.isoformat() if row.created_at else ""
        return ModerationLogEntry(
            action=row.action,
            actor_username=row.actor_username,
            char_id=row.char_id,
            char_name=row.char_name,
            login=row.login,
            reason=row.reason,
            was_online=row.was_online,
            details=row.details or {},
            created_at=created,
        )

    @staticmethod
    def _actor_pk(actor_id: UUID):
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.filter(id=actor_id).first()
        return user.pk if user else None
