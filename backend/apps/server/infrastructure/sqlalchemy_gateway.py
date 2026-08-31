from __future__ import annotations

from django.conf import settings
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from apps.server.domain.gateways import ILineageGateway, RankingEntry, ServerStatus
from apps.server.infrastructure.null_gateway import SocketStatusProbe


class SqlAlchemyLineageGateway(ILineageGateway):
    """Adaptador MySQL via SQLAlchemy. Queries no estilo L2J / Dream."""

    def __init__(self, probe: SocketStatusProbe | None = None) -> None:
        self._probe = probe or SocketStatusProbe()
        self._engine: Engine | None = None

    def _engine_or_create(self) -> Engine:
        if self._engine is None:
            user = settings.LINEAGE_DB_USER
            password = settings.LINEAGE_DB_PASSWORD
            host = settings.LINEAGE_DB_HOST
            port = settings.LINEAGE_DB_PORT
            name = settings.LINEAGE_DB_NAME
            url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"
            self._engine = create_engine(
                url,
                pool_size=settings.LINEAGE_DB_POOL_SIZE,
                max_overflow=settings.LINEAGE_DB_MAX_OVERFLOW,
                pool_pre_ping=True,
            )
        return self._engine

    def _fetch(self, sql: str, params: dict | None = None) -> list[dict]:
        with self._engine_or_create().connect() as connection:
            result = connection.execute(text(sql), params or {})
            return [dict(row._mapping) for row in result]

    def get_status(self) -> ServerStatus:
        timeout = float(settings.SERVER_STATUS_TIMEOUT)
        host = settings.GAME_SERVER_IP
        game_online = self._probe.is_open(host, int(settings.GAME_SERVER_PORT), timeout)
        login_online = self._probe.is_open(host, int(settings.LOGIN_SERVER_PORT), timeout)
        players = 0
        try:
            rows = self._fetch("SELECT COUNT(*) AS total FROM characters WHERE online = 1")
            players = int(rows[0]["total"]) if rows else 0
        except Exception:
            players = 0
        factor = float(settings.FAKE_PLAYERS_FACTOR or 1)
        players = max(int(settings.FAKE_PLAYERS_MIN), int(players * factor))
        if settings.FAKE_PLAYERS_MAX:
            players = min(players, int(settings.FAKE_PLAYERS_MAX))
        return ServerStatus(game_online=game_online, login_online=login_online, players_online=players)

    def get_top_pvp(self, limit: int = 10) -> list[RankingEntry]:
        rows = self._fetch(
            "SELECT char_name AS name, pvpkills AS value FROM characters "
            "WHERE accesslevel = 0 ORDER BY pvpkills DESC LIMIT :limit",
            {"limit": limit},
        )
        return [RankingEntry(i + 1, row["name"], int(row["value"] or 0), {}) for i, row in enumerate(rows)]

    def get_top_pk(self, limit: int = 10) -> list[RankingEntry]:
        rows = self._fetch(
            "SELECT char_name AS name, pkkills AS value FROM characters "
            "WHERE accesslevel = 0 ORDER BY pkkills DESC LIMIT :limit",
            {"limit": limit},
        )
        return [RankingEntry(i + 1, row["name"], int(row["value"] or 0), {}) for i, row in enumerate(rows)]

    def get_top_level(self, limit: int = 10) -> list[RankingEntry]:
        rows = self._fetch(
            "SELECT char_name AS name, level AS value FROM characters "
            "WHERE accesslevel = 0 ORDER BY exp DESC LIMIT :limit",
            {"limit": limit},
        )
        return [RankingEntry(i + 1, row["name"], int(row["value"] or 0), {}) for i, row in enumerate(rows)]

    def get_top_online(self, limit: int = 10) -> list[RankingEntry]:
        rows = self._fetch(
            "SELECT char_name AS name, onlinetime AS value FROM characters "
            "WHERE accesslevel = 0 ORDER BY onlinetime DESC LIMIT :limit",
            {"limit": limit},
        )
        return [RankingEntry(i + 1, row["name"], int(row["value"] or 0), {}) for i, row in enumerate(rows)]

    def get_top_clans(self, limit: int = 10) -> list[RankingEntry]:
        rows = self._fetch(
            "SELECT clan_name AS name, reputation_score AS value FROM clan_data "
            "ORDER BY reputation_score DESC LIMIT :limit",
            {"limit": limit},
        )
        return [RankingEntry(i + 1, row["name"], int(row["value"] or 0), {}) for i, row in enumerate(rows)]

    def get_top_adena(self, limit: int = 10) -> list[RankingEntry]:
        rows = self._fetch(
            "SELECT c.char_name AS name, COALESCE(i.count, 0) AS value "
            "FROM characters c LEFT JOIN items i ON i.owner_id = c.charId AND i.item_id = 57 "
            "WHERE c.accesslevel = 0 ORDER BY value DESC LIMIT :limit",
            {"limit": limit},
        )
        return [RankingEntry(i + 1, row["name"], int(row["value"] or 0), {}) for i, row in enumerate(rows)]
