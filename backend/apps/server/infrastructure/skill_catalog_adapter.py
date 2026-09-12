from __future__ import annotations

from apps.server.domain.skill_catalog import ISkillCatalog
from apps.server.infrastructure.lineage import skill_catalog as catalog


class LineageSkillCatalogAdapter(ISkillCatalog):
    """Adaptador que expõe o catálogo XML de skills via porta de domínio."""

    def display_name(self, skill_id: int, fallback: str | None = None) -> str:
        return catalog.skill_display_name(skill_id, fallback=fallback)

    def metadata(self, skill_id: int) -> dict:
        return catalog.skill_metadata(skill_id)

    def default_icon_url(self) -> str:
        return catalog.DEFAULT_SKILL_ICON
