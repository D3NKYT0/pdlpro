from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from apps.server.application.site_identity import first_text, overlay_list, overlay_map
from apps.server.domain.gateways import (
    ILineageGateway,
    RankingEntry,
    ServerInfo,
    ServerStatus,
)
from apps.server.domain.repositories import IIndexConfigRepository
from apps.server.domain.site_metadata import IPackagedSiteMetadata
from common.architecture.base import UseCase
from common.architecture.exceptions import ValidationDomainError

CHRONICLE_BY_MODULE = {
    "dreamv3": "Interlude",
    "l2dev": "High Five",
    "l2jfrozen": "Interlude",
    "lucera": "Interlude",
    "lucerav2": "Interlude",
}


def _coming_soon_at_iso(value) -> str | None:
    if value is None:
        return None
    iso = value.isoformat()
    if iso.endswith("+00:00"):
        return f"{iso[:-6]}Z"
    return iso


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
    """Entrada vazia de GetServerStatusUseCase.

    Instancie GetServerStatusInput() para consultar o status; esta operação obtém seus
    parâmetros das configurações e do gateway.
    """



class GetServerInfoUseCase(UseCase[None, ServerInfo]):
    """Monta as informações públicas do servidor a partir da configuração do painel.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``ServerInfo``.
    """

    def __init__(
        self,
        index_config: IIndexConfigRepository,
        packaged_metadata: IPackagedSiteMetadata,
    ) -> None:
        self._index_config = index_config
        self._packaged_metadata = packaged_metadata

    def execute(self, data: None = None) -> ServerInfo:
        module = str(getattr(settings, "LINEAGE_QUERY_MODULE", "") or "")
        chronicle = str(getattr(settings, "SERVER_CHRONICLE", "") or "").strip()
        if not chronicle:
            chronicle = CHRONICLE_BY_MODULE.get(module, module.capitalize() if module else "Lineage 2")
        features = [item.strip() for item in getattr(settings, "SERVER_FEATURES", []) if str(item).strip()]
        theme = self._packaged_metadata.get_overlay()
        env_name = str(getattr(settings, "PROJECT_TITLE", "PDL PRO"))
        env_description = str(getattr(settings, "PROJECT_DESCRIPTION", ""))
        env_seo_title = first_text(getattr(settings, "SITE_SEO_TITLE", ""), env_name)
        env_seo_description = first_text(getattr(settings, "SITE_SEO_DESCRIPTION", ""), env_description)
        env_og_image = str(getattr(settings, "SITE_OG_IMAGE", "") or "")
        name = first_text(theme.get("name"), env_name) or "PDL PRO"
        slogan = first_text(theme.get("slogan"))
        description = first_text(theme.get("description"), env_description)
        seo_title = first_text(theme.get("seo_title"), env_seo_title, name)
        seo_description = first_text(theme.get("seo_description"), env_seo_description, description)
        og_title = first_text(theme.get("og_title"), seo_title)
        og_description = first_text(theme.get("og_description"), seo_description)
        og_image = first_text(theme.get("og_image"), env_og_image)
        discord_url = first_text(theme.get("discord_url"), getattr(settings, "DISCORD_URL", ""))
        trailer_youtube_id = first_text(
            theme.get("trailer_youtube_id"),
            getattr(settings, "TRAILER_YOUTUBE_ID", ""),
        )
        info = ServerInfo(
            name=name,
            slogan=slogan,
            description=description,
            chronicle=first_text(theme.get("chronicle"), chronicle) or chronicle,
            rates=overlay_map(
                {
                    "xp": str(getattr(settings, "XP_RATE", "x1")),
                    "sp": str(getattr(settings, "SP_RATE", "x1")),
                    "adena": str(getattr(settings, "ADENA_RATE", "x1")),
                    "drop": str(getattr(settings, "DROP_RATE", "x1")),
                    "spoil": str(getattr(settings, "SPOIL_RATE", "x1")),
                },
                theme.get("rates"),
            ),
            enchant=overlay_map(
                {
                    "safe": str(getattr(settings, "ENCHANT_SAFE", "+3")),
                    "max": str(getattr(settings, "ENCHANT_MAX", "+16")),
                },
                theme.get("enchant"),
            ),
            max_level=int(theme.get("max_level") or getattr(settings, "MAX_LEVEL", 80)),
            features=overlay_list(
                features
                or [
                    "PvP e guerras de castelo",
                    "Eventos periódicos",
                    "Loja e marketplace no painel",
                ],
                theme.get("features"),
            ),
            notes=overlay_map(
                {
                    "pvp": str(getattr(settings, "SERVER_PVP_NOTE", "Combate livre nas zonas de PvP. Castelos seguem o calendário de siege.")),
                    "start": str(getattr(settings, "SERVER_START_NOTE", "Crie a conta mestra, baixe o cliente e vincule o login Lineage no painel.")),
                },
                theme.get("notes"),
            ),
            coming_soon=False,
            coming_soon_show_info=False,
            coming_soon_show_champions=True,
            coming_soon_title="",
            coming_soon_subtitle="",
            coming_soon_at=None,
            staff_only_login=False,
            allow_registration=True,
            allow_l2_registration=True,
            seo_title=seo_title,
            seo_description=seo_description,
            og_title=og_title,
            og_description=og_description,
            og_image=og_image,
            discord_url=discord_url,
            whatsapp_url="",
            facebook_url="",
            instagram_url="",
            youtube_url="",
            trailer_youtube_id=trailer_youtube_id,
            site_name_customized=bool(theme.get("name")),
            site_description_customized=bool(theme.get("description")),
        )
        row = self._index_config.get_active()
        if row is None:
            return info
        rates = overlay_map(info.rates, row.rates)
        enchant = overlay_map(info.enchant, row.enchant)
        notes = overlay_map(info.notes, row.notes)
        overlay_features = overlay_list(info.features, row.features)
        title = str(row.coming_soon_title or "").strip()
        subtitle = str(row.coming_soon_subtitle or "").strip()
        slogan = first_text(row.slogan, info.slogan)
        description = first_text(row.description, info.description)
        name = first_text(row.name, info.name)
        seo_title = first_text(getattr(row, "seo_title", ""), info.seo_title, name)
        seo_description = first_text(getattr(row, "seo_description", ""), info.seo_description, description)
        return ServerInfo(
            name=name,
            slogan=slogan,
            description=description,
            chronicle=first_text(row.chronicle, info.chronicle),
            rates=rates,
            enchant=enchant,
            max_level=int(row.max_level or info.max_level),
            features=overlay_features or info.features,
            notes=notes,
            coming_soon=bool(row.coming_soon),
            coming_soon_show_info=bool(getattr(row, "coming_soon_show_info", False)),
            coming_soon_show_champions=bool(getattr(row, "coming_soon_show_champions", True)),
            coming_soon_title=title or (name or "Em breve"),
            coming_soon_subtitle=subtitle or slogan or description,
            coming_soon_at=_coming_soon_at_iso(row.coming_soon_at),
            staff_only_login=bool(getattr(row, "staff_only_login", False)),
            allow_registration=bool(getattr(row, "allow_registration", True)),
            allow_l2_registration=bool(getattr(row, "allow_l2_registration", True)),
            seo_title=seo_title,
            seo_description=seo_description,
            og_title=first_text(getattr(row, "og_title", ""), seo_title, info.og_title),
            og_description=first_text(getattr(row, "og_description", ""), seo_description, info.og_description),
            og_image=first_text(getattr(row, "og_image", ""), info.og_image),
            discord_url=first_text(getattr(row, "discord_url", ""), info.discord_url),
            whatsapp_url=first_text(getattr(row, "whatsapp_url", ""), info.whatsapp_url),
            facebook_url=first_text(getattr(row, "facebook_url", ""), info.facebook_url),
            instagram_url=first_text(getattr(row, "instagram_url", ""), info.instagram_url),
            youtube_url=first_text(getattr(row, "youtube_url", ""), info.youtube_url),
            trailer_youtube_id=first_text(getattr(row, "trailer_youtube_id", ""), info.trailer_youtube_id),
            site_name_customized=bool(first_text(row.name, theme.get("name"))),
            site_description_customized=bool(first_text(row.description, theme.get("description"))),
        )


class GetServerStatusUseCase(UseCase[GetServerStatusInput, ServerStatus]):
    """Consulta disponibilidade e quantidade de jogadores pelo gateway do Lineage.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetServerStatusInput``. O
    retorno é ``ServerStatus``.
    """

    def __init__(self, lineage: ILineageGateway) -> None:
        self._lineage = lineage

    def execute(self, data: GetServerStatusInput) -> ServerStatus:
        return self._lineage.get_status()


RANKING_LIMIT_DEFAULT = 10
RANKING_LIMIT_MAX = 50


def clamp_ranking_limit(limit: int) -> int:
    """Garante entre 1 e 50 posições, inclusive quando a borda HTTP já tentou converter."""

    return max(1, min(int(limit), RANKING_LIMIT_MAX))


def parse_ranking_limit(raw: str | None) -> int:
    """Converte ``?limit=`` público; texto inválido vira o padrão em vez de 500."""

    try:
        if raw in (None, ""):
            value = RANKING_LIMIT_DEFAULT
        else:
            value = int(raw)
    except (TypeError, ValueError):
        return RANKING_LIMIT_DEFAULT
    return clamp_ranking_limit(value)


@dataclass(frozen=True, slots=True)
class GetRankingInput:
    """Dados de entrada de ``GetRankingUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    kind: str
    limit: int = RANKING_LIMIT_DEFAULT


class GetRankingUseCase(UseCase[GetRankingInput, list[RankingEntry]]):
    """Seleciona o ranking solicitado e consulta suas posições pelo gateway.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetRankingInput``. O retorno é
    ``list[RankingEntry]``. O limite é recortado para no máximo 50.
    """

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
        return fetcher(clamp_ranking_limit(data.limit))


@dataclass(frozen=True, slots=True)
class RunPublicLineageQueryInput:
    """Dados de entrada de ``RunPublicLineageQueryUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria.
    """

    name: str
    params: dict | None = None


class RunPublicLineageQueryUseCase(UseCase[RunPublicLineageQueryInput, list[dict]]):
    """Executa uma consulta pública permitida por nome e parâmetros; não recebe SQL arbitrário do
    cliente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``RunPublicLineageQueryInput``. O
    retorno é ``list[dict]``.
    """

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
