from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from django.contrib.auth import get_user_model

from apps.shop.application.commerce import get_promo, quote
from apps.shop.infrastructure.models import (
    Cart,
    CartPackage,
    PromotionCode,
    ShopPackage,
    ShopPackageItem,
    ShopPurchase,
)
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


@dataclass(frozen=True, slots=True)
class UserScopedInput:
    """Entrada com o UUID do usuário autenticado."""

    user_id: UUID


class ListActivePackagesUseCase(UseCase[None, list[ShopPackage]]):
    """Lista pacotes ativos do comércio.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def execute(self, data: None = None) -> list[ShopPackage]:
        return list(ShopPackage.objects.filter(active=True))


class ListPurchasesUseCase(UseCase[UserScopedInput, list[dict]]):
    """Lista as compras recentes do usuário autenticado.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UserScopedInput``.
    """

    def execute(self, data: UserScopedInput) -> list[dict]:
        rows = ShopPurchase.objects.filter(user__id=data.user_id).order_by("-created_at")[:100]
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

    def __init__(self, wallets: IWalletRepository) -> None:
        self._wallets = wallets

    def execute(self, data: UserScopedInput) -> dict:
        user = get_user_model().objects.get(id=data.user_id)
        cart, _ = Cart.objects.get_or_create(user=user)
        wallet = self._wallets.get_or_create(data.user_id)
        return quote(cart, user, wallet=wallet)[0]


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

    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: SetCartPackageInput) -> dict:
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            cart, _ = Cart.objects.get_or_create(user=user)
            cart = Cart.objects.select_for_update().get(pk=cart.pk)
            pack = ShopPackage.objects.filter(id=data.package_id, active=True).first()
            if pack is None:
                raise EntityNotFoundError("Pacote não encontrado.")
            if data.quantity == 0:
                CartPackage.objects.filter(cart=cart, package=pack).delete()
            else:
                CartPackage.objects.update_or_create(
                    cart=cart, package=pack, defaults={"quantity": data.quantity}
                )
            wallet = self._wallets.get_or_create(data.user_id)
            return quote(cart, user, wallet=wallet)[0]


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

    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: SetCartOptionsInput) -> dict:
        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            cart, _ = Cart.objects.get_or_create(user=user)
            cart = Cart.objects.select_for_update().get(pk=cart.pk)
            if data.promo_code is not None:
                value = data.promo_code.strip().upper()
                get_promo(value, user)
                cart.promo_code = value
            if data.use_bonus is not None:
                cart.use_bonus = data.use_bonus
            cart.save()
            wallet = self._wallets.get_or_create(data.user_id)
            return quote(cart, user, wallet=wallet)[0]


class ListStaffPackagesUseCase(UseCase[None, list[ShopPackage]]):
    """Lista todos os pacotes para administração.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def execute(self, data: None = None) -> list[ShopPackage]:
        return list(ShopPackage.objects.all())


class ListStaffPromosUseCase(UseCase[None, list[PromotionCode]]):
    """Lista todos os cupons para administração.

    Uso: resolva pelo container e chame ``execute(None)``.
    """

    def execute(self, data: None = None) -> list[PromotionCode]:
        return list(PromotionCode.objects.all())


@dataclass(frozen=True, slots=True)
class CreateStaffPackageInput:
    """Dados validados para criar um pacote administrativo."""

    name: str
    total_price: Any
    active: bool
    items: list[dict]


class CreateStaffPackageUseCase(UseCase[CreateStaffPackageInput, ShopPackage]):
    """Cria um pacote e seus itens compostos.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreateStaffPackageInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateStaffPackageInput) -> ShopPackage:
        if not data.items:
            raise ValidationDomainError("Inclua pelo menos um item.")
        with self._unit_of_work:
            pack = ShopPackage.objects.create(
                name=data.name, total_price=data.total_price, active=data.active
            )
            for item in data.items:
                ShopPackageItem.objects.create(package=pack, **item)
            return pack


@dataclass(frozen=True, slots=True)
class UpdateStaffPackageInput:
    """Dados validados para atualizar um pacote administrativo."""

    package_id: UUID
    fields: dict
    items: list[dict] | None = None


class UpdateStaffPackageUseCase(UseCase[UpdateStaffPackageInput, ShopPackage]):
    """Atualiza um pacote e, opcionalmente, recria sua composição.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateStaffPackageInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateStaffPackageInput) -> ShopPackage:
        with self._unit_of_work:
            pack = ShopPackage.objects.filter(id=data.package_id).first()
            if pack is None:
                raise EntityNotFoundError("Pacote não encontrado.")
            for key, value in data.fields.items():
                setattr(pack, key, value)
            pack.save()
            if data.items is not None:
                if not data.items:
                    raise ValidationDomainError("Inclua pelo menos um item.")
                pack.package_items.all().delete()
                for item in data.items:
                    ShopPackageItem.objects.create(package=pack, **item)
            return pack


@dataclass(frozen=True, slots=True)
class CreateStaffPromoInput:
    """Dados validados para criar um cupom administrativo."""

    fields: dict


class CreateStaffPromoUseCase(UseCase[CreateStaffPromoInput, PromotionCode]):
    """Cria um código promocional.

    Uso: resolva pelo container e chame ``execute(data)`` com ``CreateStaffPromoInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: CreateStaffPromoInput) -> PromotionCode:
        with self._unit_of_work:
            return PromotionCode.objects.create(**data.fields)


@dataclass(frozen=True, slots=True)
class UpdateStaffPromoInput:
    """Dados validados para atualizar um cupom administrativo."""

    promo_id: UUID
    fields: dict


class UpdateStaffPromoUseCase(UseCase[UpdateStaffPromoInput, PromotionCode]):
    """Atualiza um código promocional existente.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UpdateStaffPromoInput``.
    """

    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: UpdateStaffPromoInput) -> PromotionCode:
        with self._unit_of_work:
            promo = PromotionCode.objects.filter(id=data.promo_id).first()
            if promo is None:
                raise EntityNotFoundError("Cupom não encontrado.")
            for key, value in data.fields.items():
                setattr(promo, key, value)
            promo.save()
            return promo
