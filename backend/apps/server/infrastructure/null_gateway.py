from __future__ import annotations

import socket

from django.conf import settings

from apps.server.domain.gateways import ILineageGateway, RankingEntry, ServerStatus


class SocketStatusProbe:
    def is_open(self, host: str, port: int, timeout: float) -> bool:
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except OSError:
            return False


class NullLineageGateway(ILineageGateway):
    """Usado quando LINEAGE_DB_ENABLED=false. Rankings vazios, status via socket."""

    def __init__(self, probe: SocketStatusProbe | None = None) -> None:
        self._probe = probe or SocketStatusProbe()

    def get_status(self) -> ServerStatus:
        timeout = float(getattr(settings, "SERVER_STATUS_TIMEOUT", 2))
        host = getattr(settings, "GAME_SERVER_IP", "127.0.0.1")
        game_online = self._probe.is_open(host, int(getattr(settings, "GAME_SERVER_PORT", 7777)), timeout)
        login_online = self._probe.is_open(host, int(getattr(settings, "LOGIN_SERVER_PORT", 2106)), timeout)
        fake = int(getattr(settings, "FAKE_PLAYERS_MIN", 0))
        return ServerStatus(game_online=game_online, login_online=login_online, players_online=fake)

    def get_top_pvp(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_pk(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_level(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_online(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_clans(self, limit: int = 10) -> list[RankingEntry]:
        return []

    def get_top_adena(self, limit: int = 10) -> list[RankingEntry]:
        return []
