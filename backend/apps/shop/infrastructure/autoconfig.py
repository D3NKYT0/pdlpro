from __future__ import annotations

from decimal import Decimal

from apps.server.domain.item_catalog import IItemCatalog
from apps.shop.domain.autoconfig import (
    SHOP_ITEM_SKUS,
    SHOP_PACKAGES,
    IShopAutoconfigService,
    ShopPackageSpec,
    ShopSku,
)
from apps.shop.infrastructure.models import ShopItem, ShopPackage, ShopPackageItem


class DjangoShopAutoconfigService(IShopAutoconfigService):
    """Preenche ShopItem e ShopPackage com stacks Interlude NG/D/C; não apaga o que já existe."""

    def __init__(self, catalog: IItemCatalog) -> None:
        self._catalog = catalog

    def bootstrap(self) -> dict:
        created_items = 0
        sku_rows: dict[str, ShopItem] = {}
        for sku in SHOP_ITEM_SKUS:
            row, created = self._ensure_item(sku)
            sku_rows[sku.key] = row
            created_items += int(created)
        created_packages = 0
        for spec in SHOP_PACKAGES:
            created_packages += int(self._ensure_package(spec, sku_rows))
        return {
            "created": {"items": created_items, "packages": created_packages},
            "items_total": ShopItem.objects.count(),
            "packages_total": ShopPackage.objects.count(),
        }

    def _item_name(self, item_id: int) -> str:
        return self._catalog.display_name(item_id, fallback=f"Item {item_id}")

    def _ensure_item(self, sku: ShopSku) -> tuple[ShopItem, bool]:
        row = ShopItem.objects.filter(item_id=sku.item_id, quantity=sku.quantity).first()
        if row is not None:
            return row, False
        row = ShopItem.objects.create(
            name=self._item_name(sku.item_id),
            item_id=sku.item_id,
            price=Decimal(sku.price),
            quantity=sku.quantity,
            active=True,
        )
        return row, True

    def _ensure_package(self, spec: ShopPackageSpec, sku_rows: dict[str, ShopItem]) -> bool:
        if ShopPackage.objects.filter(name=spec.name).exists():
            return False
        pack = ShopPackage.objects.create(
            name=spec.name,
            total_price=Decimal(spec.total_price),
            active=True,
        )
        for key, quantity in spec.items:
            ShopPackageItem.objects.create(package=pack, item=sku_rows[key], quantity=quantity)
        return True
