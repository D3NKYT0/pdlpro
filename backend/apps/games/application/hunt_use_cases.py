"""Missões da caça do dia: leem o personagem no jogo e premiam no painel."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from uuid import UUID

from django.utils import timezone

from apps.games.application.rewards import grant_rewards
from apps.games.domain.exceptions import AlreadyClaimedError
from apps.games.domain.repositories import IBagRepository, IHuntRepository
from apps.server.domain.access import IAccountAccessService
from apps.server.domain.gateways import ILineageGateway
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import AuthorizationError, ValidationDomainError

HUNT_METRICS = ("pvp", "pk", "online_time", "level")
SNAPSHOT_FIELDS = {
    "pvp": "pvp",
    "pk": "pk_count",
    "online_time": "online_time",
    "level": "level",
}


@dataclass(frozen=True, slots=True)
class HuntActor:
    user_id: UUID
    username: str
    language: str = "pt"
    login: str = ""
    char_id: int = 0


def hunt_period_start(period: str):
    today = timezone.localdate()
    if period == "weekly":
        return today - timedelta(days=today.weekday())
    return today


def localized_text(row, field: str, language: str) -> str:
    suffix = {"en": "_en", "es": "_es"}.get((language or "pt")[:2], "")
    if suffix:
        value = (getattr(row, f"{field}{suffix}", "") or "").strip()
        if value:
            return value
    return (getattr(row, field, "") or "").strip()


def metric_progress(char, snapshot, metric: str) -> int:
    live = int(getattr(char, metric, 0) or 0)
    marked = int(getattr(snapshot, SNAPSHOT_FIELDS.get(metric, metric), 0) or 0)
    return max(0, live - marked)


class GetHuntDetailsUseCase(UseCase[HuntActor, dict]):
    """Monta as missões da caça para o personagem selecionado (ou o primeiro acessível)."""

    def __init__(
        self,
        hunt: IHuntRepository,
        lineage: ILineageGateway,
        access: IAccountAccessService,
    ) -> None:
        self._hunt = hunt
        self._lineage = lineage
        self._access = access

    def execute(self, data: HuntActor) -> dict:
        user = self._hunt.require_user(data.user_id)
        characters = _list_accessible_characters(self._access, self._lineage, data.user_id, data.username)
        if not characters:
            return {"character": None, "characters": [], "quests": []}
        selected = _pick_character(characters, data.login, data.char_id)
        if selected is None:
            raise ValidationDomainError("Personagem não encontrado.")
        if not self._access.can_access(data.user_id, data.username, selected["login"]):
            raise AuthorizationError()
        char = self._lineage.get_character(selected["login"], selected["char_id"])
        if char is None:
            raise ValidationDomainError("Personagem não encontrado.")
        quests = []
        for quest in self._hunt.list_active_quests():
            start = hunt_period_start(quest.period)
            snapshot = self._hunt.get_or_create_snapshot(
                user,
                login=selected["login"],
                character_id=char.char_id,
                period_start=start,
                pvp=char.pvp,
                pk=char.pk,
                online_time=char.online_time,
                level=char.level,
            )
            current = metric_progress(char, snapshot, quest.metric)
            quests.append(
                {
                    "id": str(quest.id),
                    "name": localized_text(quest, "name", data.language),
                    "description": localized_text(quest, "description", data.language),
                    "metric": quest.metric,
                    "target": quest.target,
                    "current": current,
                    "period": quest.period,
                    "claimed": self._hunt.has_claim(user, quest, start),
                    "rewards": list(quest.rewards or []),
                }
            )
        return {
            "character": {
                "login": selected["login"],
                "char_id": char.char_id,
                "name": char.name,
                "level": char.level,
                "pvp": char.pvp,
                "pk": char.pk,
                "online_time": char.online_time,
                "online": char.online,
            },
            "characters": characters,
            "quests": quests,
        }


@dataclass(frozen=True, slots=True)
class ClaimHuntInput:
    actor: HuntActor
    quest_id: UUID


class ClaimHuntQuestUseCase(UseCase[ClaimHuntInput, dict]):
    """Resgata a missão se o personagem atingiu a meta desde o snapshot do período."""

    def __init__(
        self,
        hunt: IHuntRepository,
        lineage: ILineageGateway,
        access: IAccountAccessService,
        bags: IBagRepository,
        wallets: IWalletRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._hunt = hunt
        self._lineage = lineage
        self._access = access
        self._bags = bags
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: ClaimHuntInput) -> dict:
        details = GetHuntDetailsUseCase(self._hunt, self._lineage, self._access).execute(data.actor)
        quest = next((item for item in details["quests"] if item["id"] == str(data.quest_id)), None)
        if quest is None:
            raise ValidationDomainError("Missão não encontrada.")
        if quest["claimed"]:
            raise AlreadyClaimedError()
        if quest["current"] < quest["target"]:
            raise ValidationDomainError("Complete o objetivo da caça antes de resgatar.")
        user = self._hunt.require_user(data.actor.user_id)
        row = self._hunt.get_active_quest(data.quest_id)
        if row is None:
            raise ValidationDomainError("Missão não encontrada.")
        start = hunt_period_start(row.period)
        character = details["character"]
        with self._unit_of_work:
            grant_rewards(
                user,
                row.rewards,
                row.name,
                wallets=self._wallets,
                bags=self._bags,
            )
            self._hunt.create_claim(
                user, row, character_id=character["char_id"], period_start=start
            )
        return GetHuntDetailsUseCase(self._hunt, self._lineage, self._access).execute(data.actor)


def _list_accessible_characters(access, lineage, user_id, username) -> list[dict]:
    rows = []
    for account in access.list_accounts(user_id, username):
        for char in lineage.list_characters(account.login):
            rows.append(
                {
                    "login": account.login,
                    "char_id": char.char_id,
                    "name": char.name,
                    "level": char.level,
                    "online": char.online,
                }
            )
    return rows


def _pick_character(characters: list[dict], login: str, char_id: int) -> dict | None:
    if login and char_id:
        for row in characters:
            if row["login"] == login and int(row["char_id"]) == int(char_id):
                return row
        return None
    return characters[0]
