from __future__ import annotations

from dataclasses import dataclass

from apps.server.domain.gateways import ILineageGateway, RankingEntry, ServerStatus
from common.architecture.base import UseCase


@dataclass(frozen=True, slots=True)
class GetServerStatusInput:
    pass


class GetServerStatusUseCase(UseCase[GetServerStatusInput, ServerStatus]):
    def __init__(self, lineage: ILineageGateway) -> None:
        self._lineage = lineage

    def execute(self, data: GetServerStatusInput) -> ServerStatus:
        return self._lineage.get_status()


@dataclass(frozen=True, slots=True)
class GetRankingInput:
    kind: str
    limit: int = 10


class GetRankingUseCase(UseCase[GetRankingInput, list[RankingEntry]]):
    def __init__(self, lineage: ILineageGateway) -> None:
        self._lineage = lineage

    def execute(self, data: GetRankingInput) -> list[RankingEntry]:
        mapping = {
            "pvp": self._lineage.get_top_pvp,
            "pk": self._lineage.get_top_pk,
            "level": self._lineage.get_top_level,
            "online": self._lineage.get_top_online,
            "clans": self._lineage.get_top_clans,
            "adena": self._lineage.get_top_adena,
        }
        fetcher = mapping.get(data.kind)
        if fetcher is None:
            from common.architecture.exceptions import ValidationDomainError

            raise ValidationDomainError(f"Ranking desconhecido: {data.kind}")
        return fetcher(data.limit)
