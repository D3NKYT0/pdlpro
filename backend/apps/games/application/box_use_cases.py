from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.games.application.bag import add_to_bag
from apps.games.application.box_catalog import (
    box_catalog_preview,
    is_legendary_box_item,
    pick_featured_box_item,
)
from apps.games.domain.exceptions import (
    BoxEmptyError,
    BoxNotOwnedError,
    BoxResetBlockedError,
    InsufficientTokensError,
)
from apps.games.domain.repositories import IBagRepository, IBoxRepository
from apps.inventory.domain.exceptions import InventoryNotFoundError
from apps.inventory.domain.repositories import IInventoryRepository
from apps.wallet.domain.repositories import IWalletRepository
from common.architecture.base import UnitOfWork, UseCase
from common.architecture.exceptions import EntityNotFoundError, ValidationDomainError


def _catalog_for(box_type, boxes: IBoxRepository) -> list:
    items = boxes.list_active_type_items(box_type)
    if not items:
        items = boxes.list_active_catalog_items()
    if not items:
        raise ValidationDomainError("Não há itens no catálogo para popular a caixa.")
    return items


def _resolve_hunt(items: list, boxes: IBoxRepository):
    featured = pick_featured_box_item(items)
    if featured is not None and is_legendary_box_item(featured):
        return featured
    featured = pick_featured_box_item(boxes.list_active_catalog_items())
    if featured is None or not is_legendary_box_item(featured):
        raise ValidationDomainError("O item em mira precisa ser lendário.")
    return featured


def _vitrine_items(box_type, boxes: IBoxRepository) -> list:
    items = list(_catalog_for(box_type, boxes))
    hunt = _resolve_hunt(items, boxes)
    if not any(_is_same_item(item, hunt) for item in items):
        items.append(hunt)
    return items


def _slot_fields(item) -> dict:
    return {
        "item_id": item.item_id,
        "item_name": item.name,
        "enchant": item.enchant,
        "quantity": max(1, getattr(item, "quantity", 1)),
        "rarity": item.rarity,
        "probability": max(getattr(item, "weight", 1), 1),
    }


def _is_same_item(left, right) -> bool:
    return left.item_id == right.item_id and getattr(left, "quantity", 1) == getattr(right, "quantity", 1)


def _hunt_still_closed(box, featured, boxes: IBoxRepository) -> bool:
    if featured is None:
        return False
    return any(_is_same_item(slot, featured) for slot in boxes.list_closed_slots(box))


def _populate(box, boxes: IBoxRepository) -> None:
    """Semeia os pacotes com um lendário em mira em um slot aleatório. O resto vem do
    catálogo do tier, sem outro lendário.

    Diferente da roleta: o jogador sempre leva o item em mira se abrir todos os pacotes.
    """
    items = _catalog_for(box.box_type, boxes)
    featured = _resolve_hunt(items, boxes)
    fillers = [item for item in items if not is_legendary_box_item(item)]
    pool = fillers or [item for item in items if not _is_same_item(item, featured)] or items
    weights = [max(getattr(item, "weight", 1), 1) for item in pool]
    count = max(1, box.box_type.boosters_amount)
    hunt_at = random.randrange(count)
    for index in range(count):
        chosen = featured if index == hunt_at else random.choices(pool, weights=weights, k=1)[0]
        boxes.create_slot(box, **_slot_fields(chosen))


class ListBoxTypesUseCase(UseCase[UUID, dict]):
    """Lista tipos ativos de caixa e as caixas do usuário com a quantidade de slots ainda fechados.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, boxes: IBoxRepository) -> None:
        self._boxes = boxes

    def execute(self, data: UUID) -> dict:
        types = []
        for row in self._boxes.list_active_types():
            featured, preview = box_catalog_preview(_vitrine_items(row, self._boxes))
            types.append(
                {
                    "id": str(row.id),
                    "name": row.name,
                    "price": str(row.price),
                    "boosters_amount": row.boosters_amount,
                    "featured": featured,
                    "items": preview,
                }
            )
        boxes = []
        for box in self._boxes.list_user_boxes(data):
            remaining = self._boxes.count_closed_slots(box)
            if remaining == 0:
                continue
            type_items = _vitrine_items(box.box_type, self._boxes)
            featured, preview = box_catalog_preview(type_items)
            boxes.append(
                {
                    "id": str(box.id),
                    "type_id": str(box.box_type.id),
                    "type_name": box.box_type.name,
                    "remaining": remaining,
                    "total": self._boxes.count_slots(box),
                    "featured": featured,
                    "items": preview,
                    "hunt_remaining": _hunt_still_closed(box, pick_featured_box_item(type_items), self._boxes),
                }
            )
        return {"types": types, "boxes": boxes}


@dataclass(frozen=True, slots=True)
class BuyBoxInput:
    """Dados de entrada de ``BuyBoxUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    box_type_id: UUID


class BuyBoxUseCase(UseCase[BuyBoxInput, dict]):
    """Cobra a caixa e gera seus slots de prêmios a partir do catálogo. Substitui caixas anteriores
    do mesmo tipo só se pelo menos um pacote já tiver sido aberto.

    Uso: resolva pelo container e chame ``execute(data)`` com ``BuyBoxInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        wallets: IWalletRepository,
        boxes: IBoxRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._wallets = wallets
        self._boxes = boxes
        self._unit_of_work = unit_of_work

    def execute(self, data: BuyBoxInput) -> dict:
        box_type = self._boxes.get_active_type(data.box_type_id)
        if box_type is None:
            raise EntityNotFoundError("Tipo de caixa não encontrado.")
        _catalog_for(box_type, self._boxes)
        with self._unit_of_work:
            user = self._boxes.require_user(data.user_id)
            for box in self._boxes.list_user_boxes(data.user_id):
                if box.box_type.pk != box_type.pk:
                    continue
                closed = self._boxes.count_closed_slots(box)
                total = self._boxes.count_slots(box)
                if total > 0 and closed == total:
                    raise BoxResetBlockedError()
            wallet = self._wallets.get_or_create(data.user_id)
            self._wallets.debit(
                wallet.id,
                Decimal(box_type.price),
                destination="boxes",
                description=f"Compra de caixa {box_type.name}",
            )
            self._boxes.delete_user_boxes_of_type(user, box_type)
            box = self._boxes.create_box(user, box_type)
            _populate(box, self._boxes)
        remaining = self._boxes.count_closed_slots(box)
        return {
            "id": str(box.id),
            "type_name": box_type.name,
            "remaining": remaining,
            "total": remaining,
        }


@dataclass(frozen=True, slots=True)
class OpenBoxInput:
    """Dados de entrada de ``OpenBoxUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    box_id: UUID


class OpenBoxUseCase(UseCase[OpenBoxInput, dict]):
    """Consome 1 ficha e abre um pacote fechado ao acaso. O item em mira já foi semeado na
    compra; quem abrir todos os pacotes sempre o leva. Transfere o prêmio à bag e remove a
    caixa quando esgotada.

    Uso: resolva pelo container e chame ``execute(data)`` com ``OpenBoxInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        boxes: IBoxRepository,
        bags: IBagRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._boxes = boxes
        self._bags = bags
        self._unit_of_work = unit_of_work

    def execute(self, data: OpenBoxInput) -> dict:
        with self._unit_of_work:
            user = self._boxes.require_user_locked(data.user_id)
            box = self._boxes.get_box(data.box_id)
            if box is None:
                raise EntityNotFoundError("Caixa não encontrada.")
            if box.user.pk != user.pk:
                raise BoxNotOwnedError()
            if user.fichas < 1:
                raise InsufficientTokensError()
            slots = self._boxes.list_closed_slots(box)
            if not slots:
                raise BoxEmptyError()
            user.fichas -= 1
            user.save(update_fields=["fichas", "updated_at"])
            chosen = random.choice(slots)
            chosen.opened = True
            self._boxes.save_slot(chosen, update_fields=["opened", "updated_at"])
            add_to_bag(
                user,
                item_id=chosen.item_id,
                item_name=chosen.item_name,
                enchant=chosen.enchant,
                quantity=max(1, getattr(chosen, "quantity", 1)),
                bags=self._bags,
            )
            remaining = self._boxes.count_closed_slots(box)
            featured = pick_featured_box_item(_vitrine_items(box.box_type, self._boxes))
            hunt = featured is not None and _is_same_item(chosen, featured)
            if remaining == 0:
                self._boxes.delete_box(box)
        return {
            "item": {
                "item_id": chosen.item_id,
                "name": chosen.item_name,
                "enchant": chosen.enchant,
                "quantity": chosen.quantity,
                "rarity": chosen.rarity,
            },
            "remaining": remaining,
            "hunt": hunt,
            "fichas": user.fichas,
        }


@dataclass(frozen=True, slots=True)
class TransferBagInput:
    """Dados de entrada de ``TransferBagToInventoryUseCase.execute``.

    Construa após validar a requisição. A dataclass transporta os campos abaixo, mas não valida
    permissões nem regras de negócio por conta própria. Os dados de identidade do ator devem vir
    da sessão autenticada.
    """

    user_id: UUID
    inventory_id: UUID


class TransferBagToInventoryUseCase(UseCase[TransferBagInput, dict]):
    """Transfere todos os itens da bag para um inventário pertencente ao usuário e limpa a bag
    dentro da operação transacional.

    Uso: resolva pelo container e chame ``execute(data)`` com ``TransferBagInput``. O retorno é
    ``dict``.
    """

    def __init__(
        self,
        inventories: IInventoryRepository,
        bags: IBagRepository,
        unit_of_work: UnitOfWork,
    ) -> None:
        self._inventories = inventories
        self._bags = bags
        self._unit_of_work = unit_of_work

    def execute(self, data: TransferBagInput) -> dict:
        inventory = self._inventories.get_by_id(data.inventory_id, data.user_id)
        if inventory is None:
            raise InventoryNotFoundError()
        bag = self._bags.get_by_user_id(data.user_id)
        items = self._bags.list_items(bag) if bag else []
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
            self._bags.clear_items(bag)
        return {"moved": moved, "inventory_id": str(inventory.id)}
