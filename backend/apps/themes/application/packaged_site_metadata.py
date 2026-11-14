from __future__ import annotations

from typing import Any

from apps.server.domain.site_metadata import IPackagedSiteMetadata
from apps.themes.application.theme_metadata import flatten_theme_metadata
from apps.themes.application.theme_packages import serialize_theme
from apps.themes.domain.repositories import IThemePackageRepository


class ThemePackagedSiteMetadata(IPackagedSiteMetadata):
    """Publica a identidade do pacote ativo, refinada por ``metadados.json``.

    Pacotes sem metadados continuam fornecendo nome e descrição do manifesto;
    assim o HTML inicial e os consumidores públicos não expõem a marca do core.
    """

    def __init__(self, packages: IThemePackageRepository) -> None:
        self._packages = packages

    def get_overlay(self) -> dict[str, Any]:
        theme = self._packages.get_active()
        if theme is None:
            return {}
        published = serialize_theme(theme)
        overlay = flatten_theme_metadata(published.get("metadata"), published.get("assets"))
        return {"name": published["name"], "description": published["description"], **overlay}
