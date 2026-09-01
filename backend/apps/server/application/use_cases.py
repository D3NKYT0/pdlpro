from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from apps.server.domain.gateways import ILineageGateway, RankingEntry, ServerInfo, ServerStatus
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError

CHRONICLE_BY_MODULE = {
    "dreamv3": "Interlude",
    "l2dev": "High Five",
    "l2jfrozen": "Interlude",
    "lucera": "Interlude",
    "lucerav2": "Interlude",
}

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


class GetServerInfoUseCase(UseCase[None, ServerInfo]):
    def execute(self, data: None = None) -> ServerInfo:
        module = str(getattr(settings, "LINEAGE_QUERY_MODULE", "") or "")
        chronicle = str(getattr(settings, "SERVER_CHRONICLE", "") or "").strip()
        if not chronicle:
            chronicle = CHRONICLE_BY_MODULE.get(module, module.capitalize() if module else "Lineage 2")
        features = [item.strip() for item in getattr(settings, "SERVER_FEATURES", []) if str(item).strip()]
        return ServerInfo(
            name=str(getattr(settings, "PROJECT_TITLE", "PDL PRO")),
            description=str(getattr(settings, "PROJECT_DESCRIPTION", "")),
            chronicle=chronicle,
            rates={
                "xp": str(getattr(settings, "XP_RATE", "x1")),
                "sp": str(getattr(settings, "SP_RATE", "x1")),
                "adena": str(getattr(settings, "ADENA_RATE", "x1")),
                "drop": str(getattr(settings, "DROP_RATE", "x1")),
                "spoil": str(getattr(settings, "SPOIL_RATE", "x1")),
            },
            enchant={
                "safe": str(getattr(settings, "ENCHANT_SAFE", "+3")),
                "max": str(getattr(settings, "ENCHANT_MAX", "+16")),
            },
            max_level=int(getattr(settings, "MAX_LEVEL", 80)),
            features=features
            or [
                "PvP e guerras de castelo",
                "Eventos periódicos",
                "Loja e marketplace no painel",
            ],
            notes={
                "pvp": str(getattr(settings, "SERVER_PVP_NOTE", "Combate livre nas zonas de PvP. Castelos seguem o calendário de siege.")),
                "start": str(getattr(settings, "SERVER_START_NOTE", "Crie a conta mestra, baixe o cliente e vincule o login Lineage no painel.")),
            },
        )


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
        if data.name == "siege_participants":
            try:
                castle_id = int(params.get("castle_id") or 0)
            except (TypeError, ValueError):
                castle_id = 0
            if castle_id < 1 or castle_id > 9:
                raise ValidationDomainError("Castelo inválido.")
            params["castle_id"] = castle_id
        return self._lineage.query(data.name, params)
