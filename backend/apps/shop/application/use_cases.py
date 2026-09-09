from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.shop.domain.repositories import ICartRepository, IShopRepository, ISupporterCommissionPort
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

    def __init__(self, shop: IShopRepository) -> None:
        self._shop = shop

    def execute(self, data: None = None) -> list[ShopItemDTO]:
        items = self._shop.list_active_items()
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

    def __init__(self, shop: IShopRepository, carts: ICartRepository, unit_of_work: UnitOfWork) -> None:
        self._shop = shop
        self._carts = carts
        self._unit_of_work = unit_of_work

    def execute(self, data: AddToCartInput) -> dict:
        item = self._shop.get_active_item(data.item_id)
        if item is None:
            raise EntityNotFoundError("Item da loja não encontrado.")
        with self._unit_of_work:
            user = self._carts.lock_user(data.user_id)
            cart = self._carts.get_or_create_for_user(user)
            cart_item, created = self._carts.get_or_create_item(
                cart, item, quantity=data.quantity
            )
            if not created:
                if cart_item.quantity + data.quantity > 99:
                    raise ValidationDomainError("Máximo de 99 unidades por produto no carrinho.")
                cart_item.quantity += data.quantity
                self._carts.save_item(cart_item)
        return get_cart_snapshot(data.user_id, self._carts)


def get_cart_snapshot(user_id: UUID, carts: ICartRepository) -> dict:
    cart = carts.get_by_user_id(user_id)
    rows = carts.snapshot_items(cart)
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

    def __init__(self, carts: ICartRepository) -> None:
        self._carts = carts

    def execute(self, data: GetCartInput) -> dict:
        return get_cart_snapshot(data.user_id, self._carts)


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

    def __init__(self, carts: ICartRepository, unit_of_work: UnitOfWork) -> None:
        self._carts = carts
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateCartItemInput) -> dict:
        with self._unit_of_work:
            self._carts.lock_user(data.user_id)
            row = self._carts.get_locked_item(data.cart_item_id, data.user_id)
            if row is None:
                raise EntityNotFoundError("Item do carrinho não encontrado.")
            if data.quantity == 0:
                self._carts.delete_item(row)
            else:
                row.quantity = data.quantity
                self._carts.save_item(row)
        return get_cart_snapshot(data.user_id, self._carts)


@dataclass(frozen=True, slots=True)
class CheckoutInput:
    """Dados de entrada de ``CheckoutUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    request_key: UUID | None = None


class CheckoutUseCase(UseCase[CheckoutInput, dict]):
    """Delega a finalização do carrinho ao serviço checkout, responsável por cobrança, entrega e
    histórico da compra.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CheckoutInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        shop: IShopRepository,
        carts: ICartRepository,
        commissions: ISupporterCommissionPort,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._shop = shop
        self._carts = carts
        self._commissions = commissions
        self._unit_of_work = unit_of_work

    def execute(self, data: CheckoutInput) -> dict:
        from apps.shop.application.commerce import checkout

        return checkout(
            data.user_id,
            data.request_key,
            wallets=self._wallets,
            shop=self._shop,
            carts=self._carts,
            commissions=self._commissions,
            unit_of_work=self._unit_of_work,
        )
