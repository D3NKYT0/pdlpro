from __future__ import annotations

from dataclasses import dataclass

from apps.server.domain.gateways import ILineageGateway, RankingEntry, ServerStatus
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError

PUBLIC_LINEAGE_QUERIES = frozenset(
    {
        "olympiad_ranking",
        "olympiad_all_heroes",
        "olympiad_current_heroes",
        "grandboss_status",
        "siege",
        "siege_participants",
        "search_characters",
        "get_clan_details",
        "clan_members",
    }
)


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


@dataclass(frozen=True, slots=True)
class RunPublicLineageQueryInput:
    name: str
    params: dict | None = None


class RunPublicLineageQueryUseCase(UseCase[RunPublicLineageQueryInput, list[dict]]):
    def __init__(self, lineage: ILineageGateway) -> None:
        self._lineage = lineage

    def execute(self, data: RunPublicLineageQueryInput) -> list[dict]:
        if data.name not in PUBLIC_LINEAGE_QUERIES:
            raise ValidationDomainError("Consulta pública inválida.")
        params = dict(data.params or {})
        if data.name == "search_characters":
            query = str(params.get("query") or "").strip()
            if len(query) < 2:
                raise ValidationDomainError("Informe ao menos 2 caracteres.")
            params["query"] = f"%{query}%"
            params["limit"] = min(int(params.get("limit") or 20), 50)
        return self._lineage.query(data.name, params)
