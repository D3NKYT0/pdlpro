from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.shop.infrastructure.models import Cart, CartItem, ShopItem
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class ShopItemDTO:
    """Produto ativo do catálogo com UUID público, tipo de item do jogo, preço e quantidade.

    É um objeto de dados; não carrega métodos de persistência do ORM. Consulte os campos tipados
    abaixo ao montar ou consumir o resultado.
    """

    id: UUID
    name: str
    item_id: int
    price: Decimal
    quantity: int


class ListShopItemsUseCase(UseCase[None, list[ShopItemDTO]]):
    """Lista os produtos ativos da loja, ordenados pelo nome, como ShopItemDTO.

    Uso: resolva pelo container e chame ``execute(data)`` com ``None`` (ou omita o argumento). O
    retorno é ``list[ShopItemDTO]``.
    """

    def execute(self, data: None = None) -> list[ShopItemDTO]:
        items = ShopItem.objects.filter(active=True).order_by("name")
        return [
            ShopItemDTO(id=item.id, name=item.name, item_id=item.item_id, price=item.price, quantity=item.quantity)
            for item in items
        ]


@dataclass(frozen=True, slots=True)
class AddToCartInput:
    """Dados de entrada de ``AddToCartUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    item_id: UUID
    quantity: int = 1


class AddToCartUseCase(UseCase[AddToCartInput, dict]):
    """Adiciona um produto ativo ao carrinho ou acumula sua quantidade sob bloqueio do usuário;
    retorna o carrinho recalculado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``AddToCartInput``. O retorno é
    ``dict``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: AddToCartInput) -> dict:
        item = ShopItem.objects.filter(id=data.item_id, active=True).first()
        if item is None:
            raise EntityNotFoundError("Item da loja não encontrado.")
        with self._unit_of_work:
            from django.contrib.auth import get_user_model

            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            cart, _ = Cart.objects.get_or_create(user=user)
            cart_item, created = CartItem.objects.get_or_create(cart=cart, item=item, defaults={"quantity": data.quantity})
            if not created:
                if cart_item.quantity + data.quantity > 99:
                    raise ValidationDomainError("Máximo de 99 unidades por produto no carrinho.")
                cart_item.quantity += data.quantity
                cart_item.save(update_fields=["quantity", "updated_at"])
        return get_cart_snapshot(data.user_id)


def get_cart_snapshot(user_id: UUID) -> dict:
    cart = Cart.objects.filter(user__id=user_id).first()
    rows = list(cart.items.select_related("item").order_by("created_at")) if cart else []
    items = []
    total = Decimal("0.00")
    count = 0
    for row in rows:
        line_total = row.item.price * row.quantity
        total += line_total
        count += row.quantity
        items.append({
            "id": str(row.id),
            "shop_item_id": str(row.item.id),
            "item_id": row.item.item_id,
            "name": row.item.name,
            "unit_price": str(row.item.price),
            "quantity": row.quantity,
            "grant_quantity": row.item.quantity,
            "line_total": str(line_total),
        })
    return {"items": items, "count": count, "total": str(total)}


@dataclass(frozen=True, slots=True)
class GetCartInput:
    """Dados de entrada de ``GetCartUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class GetCartUseCase(UseCase[GetCartInput, dict]):
    """Retorna a visão do carrinho do usuário calculada pelo serviço de comércio.

    Uso: resolva pelo container e chame ``execute(data)`` com ``GetCartInput``. O retorno é
    ``dict``.
    """

    def execute(self, data: GetCartInput) -> dict:
        return get_cart_snapshot(data.user_id)


@dataclass(frozen=True, slots=True)
class UpdateCartItemInput:
    """Dados de entrada de ``UpdateCartItemUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    cart_item_id: UUID
    quantity: int


class UpdateCartItemUseCase(UseCase[UpdateCartItemInput, dict]):
    """Atualiza a quantidade de uma linha pertencente ao carrinho do usuário; quantidade zero
    remove a linha.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateCartItemInput``. O retorno
    é ``dict``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateCartItemInput) -> dict:
        with self._unit_of_work:
            from django.contrib.auth import get_user_model

            get_user_model().objects.select_for_update().get(id=data.user_id)
            row = CartItem.objects.select_for_update().filter(id=data.cart_item_id, cart__user__id=data.user_id).first()
            if row is None:
                raise EntityNotFoundError("Item do carrinho não encontrado.")
            if data.quantity == 0:
                row.delete()
            else:
                row.quantity = data.quantity
                row.save(update_fields=["quantity", "updated_at"])
        return get_cart_snapshot(data.user_id)


@dataclass(frozen=True, slots=True)
class CheckoutInput:
    """Dados de entrada de ``CheckoutUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID


class CheckoutUseCase(UseCase[CheckoutInput, dict]):
    """Delega a finalização do carrinho ao serviço checkout, responsável por cobrança, entrega e
    histórico da compra.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CheckoutInput``. O retorno é
    ``dict``.
    """

    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: CheckoutInput) -> dict:
        from apps.shop.application.commerce import checkout

        return checkout(data.user_id)
