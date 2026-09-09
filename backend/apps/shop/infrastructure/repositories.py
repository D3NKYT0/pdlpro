from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model

from apps.programs.models import Commission, Supporter
from apps.shop.domain.repositories import (
    ICartRepository,
    IShopItemAdminRepository,
    IShopRepository,
    ISupporterCommissionPort,
)
from apps.shop.infrastructure.models import (
    Cart,
    CartItem,
    CartPackage,
    PromotionCode,
    ShopItem,
    ShopPackage,
    ShopPackageItem,
    ShopPurchase,
)

User = get_user_model()


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


class DjangoShopRepository(IShopRepository):
    """Adaptador Django de ``IShopRepository`` para catálogo, pacotes, cupons e compras."""

    def list_active_items(self) -> list[ShopItem]:
        return list(ShopItem.objects.filter(active=True).order_by("name"))

    def get_active_item(self, item_id: UUID) -> ShopItem | None:
        return ShopItem.objects.filter(id=item_id, active=True).first()

    def get_item(self, item_id: UUID) -> ShopItem | None:
        return ShopItem.objects.filter(id=item_id).first()

    def list_active_packages(self) -> list[ShopPackage]:
        return list(
            ShopPackage.objects.filter(active=True).prefetch_related(
                "package_items__item"
            )
        )

    def dump_package(self, pack: ShopPackage) -> dict:
        contents = [
            {
                "item": str(row.item.id),
                "item_id": row.item.item_id,
                "name": row.item.name,
                "quantity": row.quantity,
                "grant_quantity": row.quantity * row.item.quantity,
            }
            for row in pack.package_items.select_related("item")
        ]
        return {
            "id": pack.id,
            "name": pack.name,
            "total_price": pack.total_price,
            "active": pack.active,
            "contents": contents,
        }

    def dump_promo(self, promo: PromotionCode) -> dict:
        return {
            "id": promo.id,
            "code": promo.code,
            "percent": promo.percent,
            "active": promo.active,
            "starts_at": promo.starts_at,
            "ends_at": promo.ends_at,
            "max_uses": promo.max_uses,
            "uses": promo.uses,
            "supporter_id": promo.supporter_id,
        }

    def list_all_packages(self) -> list[ShopPackage]:
        return list(
            ShopPackage.objects.all().prefetch_related("package_items__item")
        )

    def get_package(self, package_id: UUID) -> ShopPackage | None:
        return ShopPackage.objects.filter(id=package_id).first()

    def get_active_package(self, package_id: UUID) -> ShopPackage | None:
        return ShopPackage.objects.filter(id=package_id, active=True).first()

    def create_package(self, *, name: str, total_price, active: bool, items: list[dict]) -> ShopPackage:
        pack = ShopPackage.objects.create(name=name, total_price=total_price, active=active)
        for entry in items:
            ShopPackageItem.objects.create(package=pack, item=entry["item"], quantity=entry["quantity"])
        return pack

    def save_package(self, pack: ShopPackage) -> ShopPackage:
        pack.save()
        return pack

    def replace_package_items(self, pack: ShopPackage, items: list[dict]) -> None:
        pack.package_items.all().delete()
        for entry in items:
            ShopPackageItem.objects.create(package=pack, item=entry["item"], quantity=entry["quantity"])

    def list_all_promos(self) -> list[PromotionCode]:
        return list(PromotionCode.objects.all())

    def get_promo(self, promo_id: UUID) -> PromotionCode | None:
        return PromotionCode.objects.filter(id=promo_id).first()

    def find_active_promo_by_code(self, code: str, *, lock: bool = False) -> PromotionCode | None:
        rows = (
            PromotionCode.objects.select_for_update().select_related("supporter")
            if lock
            else PromotionCode.objects.select_related("supporter")
        )
        return rows.filter(code=code, active=True).first()

    def promo_code_exists(self, code: str, *, exclude_id: UUID | None = None) -> bool:
        rows = PromotionCode.objects.filter(code=code)
        if exclude_id is not None:
            rows = rows.exclude(pk=exclude_id)
        return rows.exists()

    def create_promo(self, **fields) -> PromotionCode:
        return PromotionCode.objects.create(**fields)

    def save_promo(self, promo: PromotionCode) -> PromotionCode:
        promo.save()
        return promo

    def list_purchases(self, user_id: UUID, *, limit: int = 100) -> list[ShopPurchase]:
        return list(ShopPurchase.objects.filter(user__id=user_id).order_by("-created_at")[:limit])

    def find_purchase_by_request_key(self, user, request_key: UUID) -> ShopPurchase | None:
        return ShopPurchase.objects.filter(user=user, request_key=request_key).first()

    def create_purchase(self, **fields) -> ShopPurchase:
        return ShopPurchase.objects.create(**fields)


class DjangoCartRepository(ICartRepository):
    """Adaptador Django de ``ICartRepository`` para carrinho e bloqueio do comprador."""

    def lock_user(self, user_id: UUID):
        return User.objects.select_for_update().get(id=user_id)

    def require_user(self, user_id: UUID):
        return User.objects.get(id=user_id)

    def get_by_user_id(self, user_id: UUID) -> Cart | None:
        return Cart.objects.filter(user__id=user_id).first()

    def get_or_create_for_user(self, user) -> Cart:
        cart, _ = Cart.objects.get_or_create(user=user)
        return cart

    def get_locked_for_user(self, user) -> Cart | None:
        return Cart.objects.select_for_update().filter(user=user).first()

    def lock_cart(self, cart: Cart) -> Cart:
        return Cart.objects.select_for_update().get(pk=cart.pk)

    def get_or_create_item(self, cart, item, *, quantity: int) -> tuple[CartItem, bool]:
        return CartItem.objects.get_or_create(cart=cart, item=item, defaults={"quantity": quantity})

    def get_locked_item(self, cart_item_id: UUID, user_id: UUID) -> CartItem | None:
        return (
            CartItem.objects.select_for_update()
            .filter(id=cart_item_id, cart__user__id=user_id)
            .first()
        )

    def save_item(self, row: CartItem) -> CartItem:
        row.save(update_fields=["quantity", "updated_at"])
        return row

    def delete_item(self, row: CartItem) -> None:
        row.delete()

    def set_package_quantity(self, cart, package, quantity: int) -> None:
        if quantity == 0:
            CartPackage.objects.filter(cart=cart, package=package).delete()
        else:
            CartPackage.objects.update_or_create(
                cart=cart, package=package, defaults={"quantity": quantity}
            )

    def save_cart(self, cart: Cart) -> Cart:
        cart.save()
        return cart

    def clear_after_checkout(self, cart: Cart) -> None:
        cart.items.all().delete()
        cart.packages.all().delete()
        cart.promo_code = ""
        cart.save(update_fields=["promo_code", "updated_at"])

    def snapshot_items(self, cart: Cart | None) -> list[CartItem]:
        if cart is None:
            return []
        return list(cart.items.select_related("item").order_by("created_at"))

    def list_checkout_lines(self, cart: Cart) -> list[dict]:
        lines: list[dict] = []
        for row in cart.items.select_related("item").order_by("created_at"):
            item = row.item
            lines.append(
                {
                    "id": str(row.id),
                    "kind": "item",
                    "name": item.name,
                    "quantity": row.quantity,
                    "unit_price": item.price,
                    "active": item.active,
                    "item_id": item.item_id,
                    "item_quantity": item.quantity,
                }
            )
        for row in (
            cart.packages.select_related("package")
            .prefetch_related("package__package_items__item")
            .order_by("created_at")
        ):
            pack = row.package
            entries = list(pack.package_items.all())
            lines.append(
                {
                    "id": str(row.id),
                    "kind": "package",
                    "package_id": str(pack.id),
                    "name": pack.name,
                    "quantity": row.quantity,
                    "unit_price": pack.total_price,
                    "active": pack.active,
                    "entries": [
                        {
                            "item_id": e.item.item_id,
                            "item_name": e.item.name,
                            "item_active": e.item.active,
                            "item_quantity": e.item.quantity,
                            "entry_quantity": e.quantity,
                        }
                        for e in entries
                    ],
                }
            )
        return lines


class DjangoSupporterCommissionAdapter(ISupporterCommissionPort):
    """Adaptador que grava comissões de apoiador a partir do checkout da loja.

    Concentra o ORM de ``programs.Supporter``/``Commission`` fora da camada de aplicação.
    """

    def get_approved(self, supporter_id: UUID) -> Supporter | None:
        return Supporter.objects.filter(id=supporter_id, status="approved").first()

    def record(self, *, supporter_id: UUID, purchase: Any, due: Decimal) -> None:
        supporter = Supporter.objects.select_for_update().get(pk=supporter_id)
        amount = (Decimal(due) * supporter.commission_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
        if amount > 0 and supporter.status == "approved":
            Commission.objects.create(supporter=supporter, purchase=purchase, amount=amount)
