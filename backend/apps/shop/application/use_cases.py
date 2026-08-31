from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.shop.infrastructure.models import Cart, CartItem, ShopItem, ShopPurchase
from apps.wallet.domain.entities import InsufficientBalanceError
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError


@dataclass(frozen=True, slots=True)
class ShopItemDTO:
    id: UUID
    name: str
    item_id: int
    price: Decimal
    quantity: int


class ListShopItemsUseCase(UseCase[None, list[ShopItemDTO]]):
    def execute(self, data: None = None) -> list[ShopItemDTO]:
        items = ShopItem.objects.filter(active=True).order_by("name")
        return [
            ShopItemDTO(id=item.id, name=item.name, item_id=item.item_id, price=item.price, quantity=item.quantity)
            for item in items
        ]


@dataclass(frozen=True, slots=True)
class AddToCartInput:
    user_id: UUID
    item_id: UUID
    quantity: int = 1


class AddToCartUseCase(UseCase[AddToCartInput, dict]):
    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: AddToCartInput) -> dict:
        item = ShopItem.objects.filter(id=data.item_id, active=True).first()
        if item is None:
            raise EntityNotFoundError("Item da loja não encontrado.")
        with self._unit_of_work:
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.get(id=data.user_id)
            cart, _ = Cart.objects.get_or_create(user=user)
            cart_item, created = CartItem.objects.get_or_create(cart=cart, item=item, defaults={"quantity": data.quantity})
            if not created:
                cart_item.quantity += data.quantity
                cart_item.save(update_fields=["quantity", "updated_at"])
        return {"ok": True, "quantity": cart_item.quantity}


@dataclass(frozen=True, slots=True)
class CheckoutInput:
    user_id: UUID


class CheckoutUseCase(UseCase[CheckoutInput, dict]):
    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: CheckoutInput) -> dict:
        from django.contrib.auth import get_user_model

        user = get_user_model().objects.get(id=data.user_id)
        cart = Cart.objects.filter(user=user).first()
        if cart is None:
            raise EntityNotFoundError("Carrinho vazio.")
        items = list(cart.items.select_related("item").all())
        if not items:
            raise EntityNotFoundError("Carrinho vazio.")
        total = sum((row.item.price * row.quantity for row in items), Decimal("0.00"))
        with self._unit_of_work:
            wallet = self._wallets.get_or_create(data.user_id)
            if wallet.balance < total:
                raise InsufficientBalanceError()
            self._wallets.debit(wallet.id, total, destination="shop", description="Compra na loja")
            purchase = ShopPurchase.objects.create(user=user, total=total)
            cart.items.all().delete()
        return {"purchase_id": str(purchase.id), "total": str(total)}
