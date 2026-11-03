"""LBN-01: a transferência da bag lê e consome as pilhas somente sob o bloqueio da bag.

O teste concorrente usa threads reais sobre o caso de uso e um repositório em memória que
reproduz a semântica de ``SELECT ... FOR UPDATE`` (bloqueio liberado no fim da unidade de
trabalho). Não substitui um teste em PostgreSQL/MySQL; valida o protocolo da aplicação.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, replace
from decimal import Decimal
from uuid import UUID, uuid4

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.games.application.box_use_cases import (
    TransferBagInput,
    TransferBagToInventoryUseCase,
)
from common.architecture.exceptions import ConflictError, ValidationDomainError

User = get_user_model()


@dataclass(frozen=True)
class _Stack:
    id: UUID
    item_id: int
    item_name: str
    quantity: int
    enchant: int


@dataclass(frozen=True)
class _Inventory:
    id: UUID
    character_name: str


class _LockingBags:
    """Bag em memória: ``get_locked_by_user_id`` bloqueia até o ``__exit__`` da UoW."""

    def __init__(self, stacks: list[_Stack]) -> None:
        self.stacks = {stack.id: stack for stack in stacks}
        self.bag = object()
        self._row_lock = threading.Lock()
        self._owner: int | None = None
        # Faz as duas leituras coincidirem quando a aplicação não bloqueia antes de ler.
        self.read_barrier = threading.Barrier(2, timeout=0.5)

    def get_by_user_id(self, user_id):
        return self.bag

    def get_locked_by_user_id(self, user_id):
        self._row_lock.acquire()
        self._owner = threading.get_ident()
        return self.bag

    def release(self) -> None:
        if self._owner == threading.get_ident():
            self._owner = None
            self._row_lock.release()

    def list_items(self, bag):
        snapshot = [replace(stack) for stack in self.stacks.values()]
        try:
            self.read_barrier.wait()
        except threading.BrokenBarrierError:
            pass
        return snapshot

    def delete_items(self, bag, item_ids):
        removed = [item_id for item_id in item_ids if self.stacks.pop(item_id, None) is not None]
        return len(removed)

    def clear_items(self, bag):
        self.stacks.clear()


class _UnitOfWork:
    def __init__(self, bags: _LockingBags) -> None:
        self._bags = bags

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        self._bags.release()

    def commit(self):
        pass

    def rollback(self):
        pass


class _Inventories:
    def __init__(self) -> None:
        self.received: list[tuple[UUID, int]] = []
        self._lock = threading.Lock()
        self.rows = {uuid4(): _Inventory(uuid4(), "Hero"), uuid4(): _Inventory(uuid4(), "Alt")}

    def get_by_id(self, inventory_id, user_id):
        return self.rows.get(inventory_id)

    def add_item(self, inventory_id, item_id, item_name, quantity, enchant):
        with self._lock:
            self.received.append((inventory_id, quantity))

    def log(self, *args, **kwargs):
        pass


def _run_concurrently(use_case, inputs):
    outcomes: list = [None] * len(inputs)

    def worker(index, data):
        try:
            outcomes[index] = use_case.execute(data)
        except Exception as exc:  # noqa: BLE001 - o teste inspeciona a falha
            outcomes[index] = exc

    threads = [threading.Thread(target=worker, args=(index, data)) for index, data in enumerate(inputs)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=5)
    return outcomes


def test_concurrent_transfers_to_different_inventories_never_exceed_bag_contents():
    bags = _LockingBags([_Stack(uuid4(), 57, "Adena", 10, 0)])
    inventories = _Inventories()
    use_case = TransferBagToInventoryUseCase(inventories, bags, _UnitOfWork(bags))
    user_id = uuid4()
    targets = list(inventories.rows)

    outcomes = _run_concurrently(
        use_case, [TransferBagInput(user_id=user_id, inventory_id=target) for target in targets]
    )

    assert sum(quantity for _, quantity in inventories.received) == 10
    assert not bags.stacks
    assert sorted(type(outcome).__name__ for outcome in outcomes) == ["ValidationDomainError", "dict"]


def test_transfer_conflicts_when_a_locked_stack_was_already_consumed():
    stack = _Stack(uuid4(), 57, "Adena", 10, 0)
    bags = _LockingBags([stack])
    bags.read_barrier = threading.Barrier(1)
    bags.delete_items = lambda bag, ids: 0
    inventories = _Inventories()
    use_case = TransferBagToInventoryUseCase(inventories, bags, _UnitOfWork(bags))

    with pytest.raises(ConflictError):
        use_case.execute(TransferBagInput(user_id=uuid4(), inventory_id=next(iter(inventories.rows))))


def test_empty_bag_is_rejected_inside_the_lock():
    bags = _LockingBags([])
    bags.read_barrier = threading.Barrier(1)
    inventories = _Inventories()
    use_case = TransferBagToInventoryUseCase(inventories, bags, _UnitOfWork(bags))

    with pytest.raises(ValidationDomainError):
        use_case.execute(TransferBagInput(user_id=uuid4(), inventory_id=next(iter(inventories.rows))))
    assert bags._owner is None


@pytest.mark.django_db
def test_transfer_api_moves_stacks_and_keeps_items_added_after_the_transfer():
    from apps.games.domain.repositories import IBagRepository
    from apps.inventory.infrastructure.models import Inventory, InventoryItem
    from apps.wallet.infrastructure.models import Wallet
    from common.di.bootstrap import DependencyInjection

    player = User.objects.create_user(username="bagger", email="bagger@pdl.dev", password="Secret123")
    other = User.objects.create_user(username="intruso", email="intruso@pdl.dev", password="Secret123")
    Wallet.objects.create(user=player, balance=Decimal(0))
    bags = DependencyInjection.root().resolve(IBagRepository)
    bags.add_item(player, item_id=57, item_name="Adena", quantity=10)
    bags.add_item(player, item_id=6658, item_name="Ring", enchant=3, quantity=1)
    mine = Inventory.objects.create(user=player, character_name="Hero", account_name="bagger")
    theirs = Inventory.objects.create(user=other, character_name="Villain", account_name="intruso")
    api = APIClient()
    api.force_authenticate(user=player)

    refused = api.post("/api/v1/customer/games/bag/", {"inventory_id": str(theirs.id)}, format="json")
    assert refused.status_code == 404
    moved = api.post("/api/v1/customer/games/bag/", {"inventory_id": str(mine.id)}, format="json")
    assert moved.status_code == 200, moved.data
    assert moved.data["moved"] == 11
    assert sorted(InventoryItem.objects.filter(inventory=mine).values_list("item_id", "enchant", "quantity")) == [
        (57, 0, 10),
        (6658, 3, 1),
    ]
    again = api.post("/api/v1/customer/games/bag/", {"inventory_id": str(mine.id)}, format="json")
    assert again.status_code == 400

    bags.add_item(player, item_id=57, item_name="Adena", quantity=5)
    remaining = api.get("/api/v1/customer/games/bag/").data
    assert [(row["item_id"], row["quantity"], row["enchant"]) for row in remaining] == [(57, 5, 0)]


def test_box_purchase_locks_the_buyer_before_charging(monkeypatch):
    """VST-04: a compra serializa por usuário; duas compras simultâneas não cobram duas vezes."""
    from unittest.mock import MagicMock

    from apps.games.application import box_use_cases
    from apps.games.application.box_use_cases import BuyBoxInput, BuyBoxUseCase

    monkeypatch.setattr(box_use_cases, "_catalog_for", lambda box_type, boxes: [])
    monkeypatch.setattr(box_use_cases, "_populate", lambda box, boxes: None)
    order = []
    boxes = MagicMock()
    boxes.get_active_type.return_value = MagicMock(price=5, pk=1)
    boxes.list_user_boxes.return_value = []
    boxes.require_user_locked.side_effect = lambda user_id: order.append("lock")
    boxes.count_closed_slots.return_value = 1
    wallets = MagicMock()
    wallets.debit.side_effect = lambda *args, **kwargs: order.append("debit")
    uow = MagicMock()

    BuyBoxUseCase(wallets, boxes, uow).execute(BuyBoxInput(user_id=uuid4(), box_type_id=uuid4()))

    assert order == ["lock", "debit"]
    boxes.require_user.assert_not_called()
