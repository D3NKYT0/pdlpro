from __future__ import annotations

from typing import Any

from apps.server.domain.site_metadata import IPackagedSiteMetadata


class EmptyPackagedSiteMetadata(IPackagedSiteMetadata):
    """Usado quando nenhum pacote de tema está ativo ou o adaptador real ainda não registrou."""

    def get_overlay(self) -> dict[str, Any]:
        return {}
