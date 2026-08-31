from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from apps.clans.domain.entities import ClanApplicationEntity, ClanEntity
from apps.clans.domain.exceptions import (
    AlreadyAppliedError,
    ClanNameTakenError,
    ClanNotFoundError,
    ClanNotRecruitingError,
    NotClanOwnerError,
)
from apps.clans.domain.repositories import IClanApplicationRepository, IClanRepository
from common.architecture.base import UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError

ALLOWED_FOCUS = frozenset({"PVP", "PVE", "MIXED", "CASUAL"})
ALLOWED_REVIEW = frozenset({"approved", "rejected"})


class ListPublicClansUseCase(UseCase[None, list[ClanEntity]]):
    def __init__(self, clans: IClanRepository) -> None:
        self._clans = clans

    def execute(self, data: None = None) -> list[ClanEntity]:
        return self._clans.list_public()


@dataclass(frozen=True, slots=True)
class CreateClanInput:
    owner_id: UUID
    name: str
    description: str = ""
    motd: str = ""
    focus: str = "MIXED"
    min_level: int = 1
    recruiting: bool = True
    clan_id: int | None = None


class CreateClanUseCase(UseCase[CreateClanInput, ClanEntity]):
    def __init__(self, clans: IClanRepository) -> None:
        self._clans = clans

    def execute(self, data: CreateClanInput) -> ClanEntity:
        name = data.name.strip()
        if len(name) < 2:
            raise ValidationDomainError("Informe um nome com ao menos 2 caracteres.")
        focus = (data.focus or "MIXED").upper()
        if focus not in ALLOWED_FOCUS:
            raise ValidationDomainError("Foco inválido.")
        if self._clans.name_exists(name):
            raise ClanNameTakenError()
        return self._clans.create(
            owner_id=data.owner_id,
            name=name,
            description=data.description.strip(),
            motd=data.motd.strip(),
            focus=focus,
            min_level=max(1, data.min_level),
            recruiting=data.recruiting,
            clan_id=data.clan_id,
        )


@dataclass(frozen=True, slots=True)
class ApplyToClanInput:
    user_id: UUID
    clan_id: UUID
    char_name: str
    message: str = ""


class ApplyToClanUseCase(UseCase[ApplyToClanInput, ClanApplicationEntity]):
    def __init__(self, clans: IClanRepository, applications: IClanApplicationRepository) -> None:
        self._clans = clans
        self._applications = applications

    def execute(self, data: ApplyToClanInput) -> ClanApplicationEntity:
        clan = self._clans.get_by_id(data.clan_id)
        if clan is None:
            raise ClanNotFoundError()
        if not clan.recruiting:
            raise ClanNotRecruitingError()
        if clan.owner_id == data.user_id:
            raise ValidationDomainError("Você já é o líder deste clã.")
        char_name = data.char_name.strip()
        if len(char_name) < 2:
            raise ValidationDomainError("Informe o nome do personagem.")
        if self._applications.exists_pending(data.clan_id, data.user_id):
            raise AlreadyAppliedError()
        return self._applications.create(
            clan_id=data.clan_id,
            user_id=data.user_id,
            char_name=char_name,
            message=data.message.strip(),
        )


@dataclass(frozen=True, slots=True)
class ListMyApplicationsInput:
    user_id: UUID


class ListMyApplicationsUseCase(UseCase[ListMyApplicationsInput, list[ClanApplicationEntity]]):
    def __init__(self, applications: IClanApplicationRepository) -> None:
        self._applications = applications

    def execute(self, data: ListMyApplicationsInput) -> list[ClanApplicationEntity]:
        return self._applications.list_for_user(data.user_id)


@dataclass(frozen=True, slots=True)
class ListClanApplicationsInput:
    user_id: UUID
    clan_id: UUID


class ListClanApplicationsUseCase(UseCase[ListClanApplicationsInput, list[ClanApplicationEntity]]):
    def __init__(self, clans: IClanRepository, applications: IClanApplicationRepository) -> None:
        self._clans = clans
        self._applications = applications

    def execute(self, data: ListClanApplicationsInput) -> list[ClanApplicationEntity]:
        clan = self._clans.get_by_id(data.clan_id)
        if clan is None:
            raise ClanNotFoundError()
        if clan.owner_id != data.user_id:
            raise NotClanOwnerError()
        return self._applications.list_for_clan(data.clan_id)


@dataclass(frozen=True, slots=True)
class ReviewApplicationInput:
    user_id: UUID
    application_id: UUID
    status: str


class ReviewApplicationUseCase(UseCase[ReviewApplicationInput, ClanApplicationEntity]):
    def __init__(self, clans: IClanRepository, applications: IClanApplicationRepository) -> None:
        self._clans = clans
        self._applications = applications

    def execute(self, data: ReviewApplicationInput) -> ClanApplicationEntity:
        status = data.status.lower()
        if status not in ALLOWED_REVIEW:
            raise ValidationDomainError("Status inválido.")
        current = self._applications.get_by_id(data.application_id)
        if current is None:
            raise EntityNotFoundError("Inscrição não encontrada.")
        clan = self._clans.get_by_id(current.clan_id)
        if clan is None or clan.owner_id != data.user_id:
            raise NotClanOwnerError()
        reviewed = self._applications.review(data.application_id, status=status)
        if reviewed is None:
            raise EntityNotFoundError("Inscrição não encontrada.")
        return reviewed
