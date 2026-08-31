from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.games.application.bag import add_to_bag
from apps.games.domain.exceptions import BoxEmptyError, BoxNotOwnedError, InsufficientTokensError
from apps.games.infrastructure.models import Box, BoxSlot, BoxType, CatalogItem
from apps.inventory.domain.exceptions import InventoryNotFoundError
from apps.inventory.domain.repositories import IInventoryRepository
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def _catalog_for(box_type: BoxType) -> list[CatalogItem]:
    items = list(box_type.items.filter(active=True))
    if not items:
        items = list(CatalogItem.objects.filter(active=True))
    if not items:
        raise ValidationDomainError("Não há itens no catálogo para popular a caixa.")
    return items


def _populate(box: Box) -> None:
    items = _catalog_for(box.box_type)
    weights = [max(item.weight, 1) for item in items]
    for _ in range(box.box_type.boosters_amount):
        chosen = random.choices(items, weights=weights, k=1)[0]
        BoxSlot.objects.create(
            box=box,
            item_id=chosen.item_id,
            item_name=chosen.name,
            enchant=chosen.enchant,
            rarity=chosen.rarity,
            probability=chosen.weight,
        )


class ListBoxTypesUseCase(UseCase[UUID, dict]):
    def execute(self, data: UUID) -> dict:
        types = []
        for row in BoxType.objects.filter(active=True).order_by("name"):
            types.append(
                {
                    "id": str(row.id),
                    "name": row.name,
                    "price": str(row.price),
                    "boosters_amount": row.boosters_amount,
                }
            )
        boxes = []
        for box in Box.objects.filter(user__id=data).select_related("box_type"):
            remaining = box.slots.filter(opened=False).count()
            if remaining == 0:
                continue
            boxes.append(
                {
                    "id": str(box.id),
                    "type_name": box.box_type.name,
                    "remaining": remaining,
                    "total": box.slots.count(),
                }
            )
        return {"types": types, "boxes": boxes}


@dataclass(frozen=True, slots=True)
class BuyBoxInput:
    user_id: UUID
    box_type_id: UUID


class BuyBoxUseCase(UseCase[BuyBoxInput, dict]):
    def __init__(self, wallets: IWalletRepository, unit_of_work: UnitOfWork) -> None:
        self._wallets = wallets
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyBoxInput) -> dict:
        from django.contrib.auth import get_user_model

        box_type = BoxType.objects.filter(id=data.box_type_id, active=True).first()
        if box_type is None:
            raise EntityNotFoundError("Tipo de caixa não encontrado.")
        _catalog_for(box_type)
        with self._unit_of_work:
            user = get_user_model().objects.get(id=data.user_id)
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.debit(
                wallet.id,
                Decimal(box_type.price),
                destination="boxes",
                description=f"Compra de caixa {box_type.name}",
            )
            Box.objects.filter(user=user, box_type=box_type).delete()
            box = Box.objects.create(user=user, box_type=box_type)
            _populate(box)
        remaining = box.slots.filter(opened=False).count()
        return {"id": str(box.id), "type_name": box_type.name, "remaining": remaining, "total": remaining}


@dataclass(frozen=True, slots=True)
class OpenBoxInput:
    user_id: UUID
    box_id: UUID


class OpenBoxUseCase(UseCase[OpenBoxInput, dict]):
    def __init__(self, unit_of_work: UnitOfWork) -> None:
        self._unit_of_work = unit_of_work

    def execute(self, data: OpenBoxInput) -> dict:
        from django.contrib.auth import get_user_model

        with self._unit_of_work:
            user = get_user_model().objects.select_for_update().get(id=data.user_id)
            box = Box.objects.select_related("box_type", "user").filter(id=data.box_id).first()
            if box is None:
                raise EntityNotFoundError("Caixa não encontrada.")
            if box.user.pk != user.pk:
                raise BoxNotOwnedError()
            if user.fichas < 1:
                raise InsufficientTokensError()
            slots = list(box.slots.filter(opened=False))
            if not slots:
                raise BoxEmptyError()
            user.fichas -= 1
            user.save(update_fields=["fichas", "updated_at"])
            chosen = random.choices(slots, weights=[max(slot.probability, 1) for slot in slots], k=1)[0]
            chosen.opened = True
            chosen.save(update_fields=["opened", "updated_at"])
            add_to_bag(
                user,
                item_id=chosen.item_id,
                item_name=chosen.item_name,
                enchant=chosen.enchant,
            )
            remaining = box.slots.filter(opened=False).count()
            if remaining == 0:
                box.delete()
        return {
            "item": {
                "item_id": chosen.item_id,
                "name": chosen.item_name,
                "enchant": chosen.enchant,
                "rarity": chosen.rarity,
            },
            "remaining": remaining,
            "fichas": user.fichas,
        }


@dataclass(frozen=True, slots=True)
class TransferBagInput:
    user_id: UUID
    inventory_id: UUID


class TransferBagToInventoryUseCase(UseCase[TransferBagInput, dict]):
    def __init__(self, inventories: IInventoryRepository, unit_of_work: UnitOfWork) -> None:
        self._inventories = inventories
        self._unit_of_work = unit_of_work

    def execute(self, data: TransferBagInput) -> dict:
        from apps.games.infrastructure.models import Bag

        inventory = self._inventories.get_by_id(data.inventory_id, data.user_id)
        if inventory is None:
            raise InventoryNotFoundError()
        bag = Bag.objects.filter(user__id=data.user_id).first()
        items = list(bag.items.all()) if bag else []
        if not items:
            raise ValidationDomainError("A bag está vazia.")
        moved = 0
        with self._unit_of_work:
            for item in items:
                self._inventories.add_item(
                    inventory.id,
                    item.item_id,
                    item.item_name,
                    item.quantity,
                    item.enchant,
                )
                self._inventories.log(
                    data.user_id,
                    action="bag_transfer",
                    item_id=item.item_id,
                    item_name=item.item_name,
                    quantity=item.quantity,
                    enchant=item.enchant,
                    origin="bag",
                    destination=inventory.character_name,
                )
                moved += item.quantity
            bag.items.all().delete()
        return {"moved": moved, "inventory_id": str(inventory.id)}
