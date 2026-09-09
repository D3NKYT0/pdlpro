from __future__ import annotations

from apps.server.domain.item_catalog import IItemCatalog, IItemDisplayName
from apps.server.infrastructure.lineage import item_catalog as catalog


class LineageItemCatalogAdapter(IItemCatalog, IItemDisplayName):
    """Adaptador que expõe o catálogo XML/custom via portas de domínio."""

    def xml_contains(self, item_id: int) -> bool:
        return catalog.get_xml_catalog().get(item_id) is not None

    def display_name(self, item_id: int, fallback: str | None = None) -> str:
        return catalog.item_display_name(item_id, fallback=fallback)

    def metadata(self, item_id: int) -> dict:
        return catalog.item_metadata(item_id)

    def is_tradeable(self, item_id: int) -> bool:
        return catalog.item_is_tradeable(item_id)

    def list_public_items(self) -> list[dict]:
        return [catalog.item_metadata(item.id) for item in catalog.get_item_catalog().all()]

    def default_icon_url(self) -> str:
        return catalog.DEFAULT_ITEM_ICON
