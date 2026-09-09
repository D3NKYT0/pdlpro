from __future__ import annotations

from dataclasses import dataclass

from apps.server.domain.item_catalog import IItemCatalog
from common.architecture.base import UseCase


class ListPublicItemCatalogUseCase(UseCase[None, dict]):
    """Lista o catálogo público composto (XML + customs) para a API."""

    def __init__(self, catalog: IItemCatalog) -> None:
        self._catalog = catalog

    def execute(self, data: None = None) -> dict:
        return {
            "items": self._catalog.list_public_items(),
            "default_icon_url": self._catalog.default_icon_url(),
        }


@dataclass(frozen=True, slots=True)
class ItemTradeableInput:
    item_id: int


class ItemIsTradeableUseCase(UseCase[ItemTradeableInput, bool]):
    """Indica se o item do catálogo é negociável."""

    def __init__(self, catalog: IItemCatalog) -> None:
        self._catalog = catalog

    def execute(self, data: ItemTradeableInput) -> bool:
        return self._catalog.is_tradeable(data.item_id)


def serialize_custom_item(row, *, catalog: IItemCatalog) -> dict:
    return {
        "id": row.id,
        "item_id": row.item_id,
        "name": row.name,
        "icon_url": row.image.url if row.image else None,
        "category": row.category,
        "grade": row.grade,
        "tradeable": row.tradeable,
        "metadata": row.metadata,
        "active": row.active,
        "conflicts_with_xml": catalog.xml_contains(row.item_id),
        "created_at": row.created_at,
        "updated_at": row.updated_at,
    }


def serialize_observation_category(row) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "description": row.description,
        "item_ids": row.item_ids,
        "order": row.order,
    }


def serialize_observation_snapshot(row) -> dict:
    created_by = getattr(row, "created_by", None)
    return {
        "id": row.id,
        "snapshot_date": row.snapshot_date,
        "source": row.source,
        "created_at": row.created_at,
        "created_by": created_by.username if created_by else None,
        "notes": row.notes,
        "total_characters": row.total_characters,
        "total_instances": row.total_instances,
        "total_quantity": row.total_quantity,
        "site_quantity": row.site_quantity,
    }
