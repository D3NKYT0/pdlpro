from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from apps.shop.application.commerce import get_promo, quote
from apps.shop.domain.repositories import (
    ICartRepository,
    IShopRepository,
    ISupporterCommissionPort,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class UserScopedInput:
    """Entrada com o UUID do usuário autenticado."""

    user_id: UUID


class ListActivePackagesUseCase(UseCase[None, list[dict]]):
    """Lista pacotes ativos do comércio.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def __init__(self, shop: IShopRepository) -> None:
        self._shop = shop

    def execute(self, data: None = None) -> list[dict]:
        return [self._shop.dump_package(row) for row in self._shop.list_active_packages()]


class ListPurchasesUseCase(UseCase[UserScopedInput, list[dict]]):
    """Lista as compras recentes do usuário autenticado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UserScopedInput``.
    """

    def __init__(self, shop: IShopRepository) -> None:
        self._shop = shop

    def execute(self, data: UserScopedInput) -> list[dict]:
        rows = self._shop.list_purchases(data.user_id, limit=100)
        return [
            {
                "id": str(r.id),
                "total": str(r.total),
                "subtotal": str(r.subtotal),
                "discount": str(r.discount),
                "bonus_used": str(r.bonus_used),
                "promo_code": r.promo_code,
                "items": r.items_snapshot,
                "created_at": r.created_at,
            }
            for r in rows
        ]


class QuoteCartUseCase(UseCase[UserScopedInput, dict]):
    """Calcula a cotação atual do carrinho do usuário.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UserScopedInput``.
    """

    def __init__(self, wallets: IWalletRepository, shop: IShopRepository, carts: ICartRepository) -> None:
        self._wallets = wallets
        self._shop = shop
        self._carts = carts

    def execute(self, data: UserScopedInput) -> dict:
        user = self._carts.require_user(data.user_id)
        cart = self._carts.get_or_create_for_user(user)
        wallet = self._wallets.get_or_create(data.user_id)
        return quote(cart, user, shop=self._shop, carts=self._carts, wallet=wallet)[0]


@dataclass(frozen=True, slots=True)
class SetCartPackageInput:
    """Dados de entrada de ``SetCartPackageUseCase.execute``."""

    user_id: UUID
    package_id: UUID
    quantity: int


class SetCartPackageUseCase(UseCase[SetCartPackageInput, dict]):
    """Atualiza a quantidade de um pacote no carrinho e devolve a cotação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``SetCartPackageInput``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        shop: IShopRepository,
        carts: ICartRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._shop = shop
        self._carts = carts
        self._unit_of_work = unit_of_work

    def execute(self, data: SetCartPackageInput) -> dict:
        with self._unit_of_work:
            user = self._carts.lock_user(data.user_id)
            cart = self._carts.get_or_create_for_user(user)
            cart = self._carts.lock_cart(cart)
            pack = self._shop.get_active_package(data.package_id)
            if pack is None:
                raise EntityNotFoundError("Pacote não encontrado.")
            self._carts.set_package_quantity(cart, pack, data.quantity)
            wallet = self._wallets.get_or_create(data.user_id)
            return quote(cart, user, shop=self._shop, carts=self._carts, wallet=wallet)[0]


@dataclass(frozen=True, slots=True)
class SetCartOptionsInput:
    """Dados de entrada de ``SetCartOptionsUseCase.execute``."""

    user_id: UUID
    promo_code: str | None = None
    use_bonus: bool | None = None


class SetCartOptionsUseCase(UseCase[SetCartOptionsInput, dict]):
    """Atualiza cupom/bônus do carrinho e devolve a cotação.

    Uso: resolva pelo container e chame ``execute(data)`` com ``SetCartOptionsInput``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        shop: IShopRepository,
        carts: ICartRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._shop = shop
        self._carts = carts
        self._unit_of_work = unit_of_work

    def execute(self, data: SetCartOptionsInput) -> dict:
        with self._unit_of_work:
            user = self._carts.lock_user(data.user_id)
            cart = self._carts.get_or_create_for_user(user)
            cart = self._carts.lock_cart(cart)
            if data.promo_code is not None:
                value = data.promo_code.strip().upper()
                get_promo(value, user, shop=self._shop)
                cart.promo_code = value
            if data.use_bonus is not None:
                cart.use_bonus = data.use_bonus
            self._carts.save_cart(cart)
            wallet = self._wallets.get_or_create(data.user_id)
            return quote(cart, user, shop=self._shop, carts=self._carts, wallet=wallet)[0]


class ListStaffPackagesUseCase(UseCase[None, list[dict]]):
    """Lista todos os pacotes para administração.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def __init__(self, shop: IShopRepository) -> None:
        self._shop = shop

    def execute(self, data: None = None) -> list[dict]:
        return [self._shop.dump_package(row) for row in self._shop.list_all_packages()]


class GetStaffPackageUseCase(UseCase[UUID, dict]):
    """Obtém um pacote administrativo por id ou lança EntityNotFoundError."""

    def __init__(self, shop: IShopRepository) -> None:
        self._shop = shop

    def execute(self, data: UUID) -> dict:
        pack = self._shop.get_package(data)
        if pack is None:
            raise EntityNotFoundError("Pacote não encontrado.")
        return self._shop.dump_package(pack)


class ListStaffPromosUseCase(UseCase[None, list[dict]]):
    """Lista todos os cupons para administração.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def __init__(self, shop: IShopRepository) -> None:
        self._shop = shop

    def execute(self, data: None = None) -> list[dict]:
        return [self._shop.dump_promo(row) for row in self._shop.list_all_promos()]


class GetStaffPromoUseCase(UseCase[UUID, dict]):
    """Obtém um cupom administrativo por id ou lança EntityNotFoundError."""

    def __init__(self, shop: IShopRepository) -> None:
        self._shop = shop

    def execute(self, data: UUID) -> dict:
        promo = self._shop.get_promo(data)
        if promo is None:
            raise EntityNotFoundError("Cupom não encontrado.")
        return self._shop.dump_promo(promo)


def _resolve_package_items(shop: IShopRepository, items: list[dict]) -> list[dict]:
    resolved = []
    for entry in items:
        item = shop.get_item(entry["item"])
        if item is None:
            raise ValidationDomainError("Item da loja não encontrado.")
        resolved.append({"item": item, "quantity": entry["quantity"]})
    return resolved


@dataclass(frozen=True, slots=True)
class CreateStaffPackageInput:
    """Dados validados para criar um pacote administrativo."""

    name: str
    total_price: Any
    active: bool
    items: list[dict]


class CreateStaffPackageUseCase(UseCase[CreateStaffPackageInput, dict]):
    """Cria um pacote e seus itens compostos.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreateStaffPackageInput``.
    """

    def __init__(self, shop: IShopRepository, unit_of_work: UnitOfWork) -> None:
        self._shop = shop
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateStaffPackageInput) -> dict:
        if not data.items:
            raise ValidationDomainError("Inclua pelo menos um item.")
        with self._unit_of_work:
            pack = self._shop.create_package(
                name=data.name,
                total_price=data.total_price,
                active=data.active,
                items=_resolve_package_items(self._shop, data.items),
            )
            return self._shop.dump_package(pack)


@dataclass(frozen=True, slots=True)
class UpdateStaffPackageInput:
    """Dados validados para atualizar um pacote administrativo."""

    package_id: UUID
    fields: dict
    items: list[dict] | None = None


class UpdateStaffPackageUseCase(UseCase[UpdateStaffPackageInput, dict]):
    """Atualiza um pacote e, opcionalmente, recria sua composição.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateStaffPackageInput``.
    """

    def __init__(self, shop: IShopRepository, unit_of_work: UnitOfWork) -> None:
        self._shop = shop
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateStaffPackageInput) -> dict:
        with self._unit_of_work:
            pack = self._shop.get_package(data.package_id)
            if pack is None:
                raise EntityNotFoundError("Pacote não encontrado.")
            for key, value in data.fields.items():
                setattr(pack, key, value)
            self._shop.save_package(pack)
            if data.items is not None:
                if not data.items:
                    raise ValidationDomainError("Inclua pelo menos um item.")
                self._shop.replace_package_items(
                    pack, _resolve_package_items(self._shop, data.items)
                )
            return self._shop.dump_package(pack)


@dataclass(frozen=True, slots=True)
class CreateStaffPromoInput:
    """Dados validados para criar um cupom administrativo."""

    fields: dict


class CreateStaffPromoUseCase(UseCase[CreateStaffPromoInput, dict]):
    """Cria um código promocional.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreateStaffPromoInput``.
    """

    def __init__(
        self,
        shop: IShopRepository,
        commissions: ISupporterCommissionPort,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._shop = shop
        self._commissions = commissions
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateStaffPromoInput) -> dict:
        fields = dict(data.fields)
        code = str(fields.get("code", "")).strip().upper()
        fields["code"] = code
        if self._shop.promo_code_exists(code):
            raise ValidationDomainError("Este código já existe.")
        supporter_id = fields.pop("supporter_id", None)
        if supporter_id is not None:
            supporter = self._commissions.get_approved(supporter_id)
            if supporter is None:
                raise ValidationDomainError("Apoiador aprovado não encontrado.")
            fields["supporter"] = supporter
        with self._unit_of_work:
            return self._shop.dump_promo(self._shop.create_promo(**fields))


@dataclass(frozen=True, slots=True)
class UpdateStaffPromoInput:
    """Dados validados para atualizar um cupom administrativo."""

    promo_id: UUID
    fields: dict


class UpdateStaffPromoUseCase(UseCase[UpdateStaffPromoInput, dict]):
    """Atualiza um código promocional existente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateStaffPromoInput``.
    """

    def __init__(
        self,
        shop: IShopRepository,
        commissions: ISupporterCommissionPort,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._shop = shop
        self._commissions = commissions
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateStaffPromoInput) -> dict:
        fields = dict(data.fields)
        with self._unit_of_work:
            promo = self._shop.get_promo(data.promo_id)
            if promo is None:
                raise EntityNotFoundError("Cupom não encontrado.")
            if "code" in fields:
                code = str(fields["code"]).strip().upper()
                fields["code"] = code
                if self._shop.promo_code_exists(code, exclude_id=data.promo_id):
                    raise ValidationDomainError("Este código já existe.")
            if "supporter_id" in fields:
                supporter_id = fields.pop("supporter_id")
                if supporter_id is None:
                    fields["supporter"] = None
                else:
                    supporter = self._commissions.get_approved(supporter_id)
                    if supporter is None:
                        raise ValidationDomainError("Apoiador aprovado não encontrado.")
                    fields["supporter"] = supporter
            for key, value in fields.items():
                setattr(promo, key, value)
            return self._shop.dump_promo(self._shop.save_promo(promo))
