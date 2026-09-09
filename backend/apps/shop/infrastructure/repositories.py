from __future__ import annotations

from typing import Any
from uuid import UUID

from apps.shop.domain.repositories import IShopItemAdminRepository
from apps.shop.infrastructure.models import ShopItem


class DjangoShopItemAdminRepository(IShopItemAdminRepository):
    """Adaptador Django de ``IShopItemAdminRepository`` para produtos da loja."""

    def list_all(self) -> list[ShopItem]:
        return list(ShopItem.objects.all().order_by("name"))

    def get_by_id(self, item_id: UUID) -> ShopItem | None:
        return ShopItem.objects.filter(id=item_id).first()

    def new(self, **fields) -> ShopItem:
        return ShopItem(**fields)

    def save(self, row: ShopItem) -> ShopItem:
        row.save()
        return row
