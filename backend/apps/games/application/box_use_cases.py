from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal
from uuid import UUID

from apps.games.application.bag import add_to_bag
from apps.games.domain.exceptions import (
    BoxEmptyError,
    BoxNotOwnedError,
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


def _populate(box, boxes: IBoxRepository) -> None:
    items = _catalog_for(box.box_type, boxes)
    weights = [max(item.weight, 1) for item in items]
    for _ in range(box.box_type.boosters_amount):
        chosen = random.choices(items, weights=weights, k=1)[0]
        boxes.create_slot(
            box,
            item_id=chosen.item_id,
            item_name=chosen.name,
            enchant=chosen.enchant,
            rarity=chosen.rarity,
            probability=chosen.weight,
        )


class ListBoxTypesUseCase(UseCase[UUID, dict]):
    """Lista tipos ativos de caixa e as caixas do usuário com a quantidade de slots ainda fechados.

    Uso: resolva pelo container e chame ``execute(data)`` com ``UUID``. O retorno é ``dict``.
    """

    def __init__(self, boxes: IBoxRepository) -> None:
        self._boxes = boxes

    def execute(self, data: UUID) -> dict:
        types = []
        for row in self._boxes.list_active_types():
            types.append(
                {
                    "id": str(row.id),
                    "name": row.name,
                    "price": str(row.price),
                    "boosters_amount": row.boosters_amount,
                }
            )
        boxes = []
        for box in self._boxes.list_user_boxes(data):
            remaining = self._boxes.count_closed_slots(box)
            if remaining == 0:
                continue
            boxes.append(
                {
                    "id": str(box.id),
                    "type_name": box.box_type.name,
                    "remaining": remaining,
                    "total": self._boxes.count_slots(box),
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
    do mesmo tipo pertencentes ao usuário.

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
    """Consome fichas e sorteia um slot fechado da caixa do usuário, transfere o prêmio à bag e
    remove a caixa quando esgotada.

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
            chosen = random.choices(
                slots, weights=[max(slot.probability, 1) for slot in slots], k=1
            )[0]
            chosen.opened = True
            self._boxes.save_slot(chosen, update_fields=["opened", "updated_at"])
            add_to_bag(
                user,
                item_id=chosen.item_id,
                item_name=chosen.item_name,
                enchant=chosen.enchant,
                bags=self._bags,
            )
            remaining = self._boxes.count_closed_slots(box)
            if remaining == 0:
                self._boxes.delete_box(box)
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
