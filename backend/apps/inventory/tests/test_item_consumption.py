"""LBN-02/LBN-03: consumo condicional no painel e retirada por encantamento exato."""

from unittest.mock import Mock
from uuid import uuid4

import pytest
from django.contrib.auth import get_user_model
from django.db.models.query import QuerySet
from rest_framework.test import APIClient

from apps.inventory.application.use_cases import (
    DepositItemInput,
    DepositItemUseCase,
    InventoryActor,
)
from apps.inventory.domain.entities import InventoryEntity, InventoryItemEntity
from apps.inventory.domain.exceptions import InsufficientItemQuantityError
from apps.inventory.infrastructure.models import Inventory, InventoryItem
from apps.inventory.infrastructure.repositories import DjangoInventoryRepository
from apps.server.domain.gateways import GameItem, ILineageGateway
from apps.server.infrastructure.null_gateway import NullLineageGateway

User = get_user_model()


@pytest.fixture
def player(db):
    return User.objects.create_user(username="hero", email="hero@pdl.dev", password="Secret123")


@pytest.fixture
def stack(player):
    inventory = Inventory.objects.create(user=player, character_name="Hero", account_name="hero")
    return InventoryItem.objects.create(
        inventory=inventory, user=player, item_id=6579, item_name="Espada", quantity=1, enchant=0,
        character_name="Hero",
    )


def _stale_first(monkeypatch, consume):
    """Faz a leitura de ``remove_item`` devolver a pilha e, logo depois, outra requisição consumi-la."""

    original = QuerySet.first

    def first(self):
        row = original(self)
        if row is not None and isinstance(row, InventoryItem):
            consume(row)
        return row

    monkeypatch.setattr(QuerySet, "first", first)


@pytest.mark.django_db
def test_last_unit_is_delivered_once_when_another_request_consumed_it(monkeypatch, stack):
    repo = DjangoInventoryRepository()
    _stale_first(monkeypatch, lambda row: InventoryItem.objects.filter(pk=row.pk).delete())

    with pytest.raises(InsufficientItemQuantityError):
        repo.remove_item(stack.inventory.id, 6579, 1, 0)


@pytest.mark.django_db
def test_partial_consumption_by_another_request_is_not_overwritten(monkeypatch, stack):
    InventoryItem.objects.filter(pk=stack.pk).update(quantity=5)
    repo = DjangoInventoryRepository()
    _stale_first(monkeypatch, lambda row: InventoryItem.objects.filter(pk=row.pk).update(quantity=2))

    with pytest.raises(InsufficientItemQuantityError):
        repo.remove_item(stack.inventory.id, 6579, 3, 0)
    assert InventoryItem.objects.get(pk=stack.pk).quantity == 2


@pytest.mark.django_db
def test_removal_decrements_then_deletes_the_empty_stack(stack):
    repo = DjangoInventoryRepository()
    InventoryItem.objects.filter(pk=stack.pk).update(quantity=3)

    removed = repo.remove_item(stack.inventory.id, 6579, 2, 0)
    assert removed.quantity == 2
    assert InventoryItem.objects.get(pk=stack.pk).quantity == 1
    repo.remove_item(stack.inventory.id, 6579, 1, 0)
    assert not InventoryItem.objects.filter(pk=stack.pk).exists()
    with pytest.raises(InsufficientItemQuantityError):
        repo.remove_item(stack.inventory.id, 6579, 1, 0)


@pytest.mark.django_db
def test_concurrent_additions_to_the_same_stack_are_both_kept(monkeypatch, stack):
    repo = DjangoInventoryRepository()
    _stale_first(monkeypatch, lambda row: InventoryItem.objects.filter(pk=row.pk).update(quantity=4))

    added = repo.add_item(stack.inventory.id, 6579, "Espada", 2, 0)

    assert added.quantity == 6


def _deposit_use_case(lineage, inventories):
    access = Mock()
    access.can_access.return_value = True
    uow = Mock()
    uow.__enter__ = Mock(return_value=uow)
    uow.__exit__ = Mock(return_value=False)
    return DepositItemUseCase(lineage, access, inventories, uow)


def _deposit_input():
    return DepositItemInput(
        actor=InventoryActor(user_id=uuid4(), username="hero", login="hero"),
        inventory_id=uuid4(), item_id=6579, quantity=1, enchant=0,
    )


def test_deposit_never_reaches_the_game_when_the_panel_removal_fails():
    lineage = Mock(spec=ILineageGateway)
    inventories = Mock()
    inventories.get_by_id.return_value = InventoryEntity(uuid4(), uuid4(), "Hero", "hero")
    inventories.remove_item.side_effect = InsufficientItemQuantityError()

    with pytest.raises(InsufficientItemQuantityError):
        _deposit_use_case(lineage, inventories).execute(_deposit_input())
    lineage.deposit_item.assert_not_called()


def test_deposit_reaches_the_game_only_after_every_panel_write():
    calls = []
    lineage = Mock(spec=ILineageGateway)
    lineage.deposit_item.side_effect = lambda *args: calls.append("game")
    inventories = Mock()
    inventories.get_by_id.return_value = InventoryEntity(uuid4(), uuid4(), "Hero", "hero")
    inventories.remove_item.side_effect = lambda *args: calls.append("remove") or InventoryItemEntity(
        uuid4(), uuid4(), 6579, "Espada", 1, 0
    )
    inventories.log.side_effect = lambda *args, **kwargs: calls.append("log")

    _deposit_use_case(lineage, inventories).execute(_deposit_input())
    assert calls == ["remove", "log", "game"]

    calls.clear()
    inventories.log.side_effect = RuntimeError("falha ao registrar")
    with pytest.raises(RuntimeError):
        _deposit_use_case(lineage, inventories).execute(_deposit_input())
    assert "game" not in calls


@pytest.mark.django_db
def test_withdraw_api_preserves_each_enchant(player):
    from common.di.bootstrap import DependencyInjection

    api = APIClient()
    api.force_authenticate(user=player)
    api.post("/api/v1/customer/server/accounts/register/", {"password": "l2pass123"}, format="json")
    gateway = DependencyInjection.root().resolve(ILineageGateway)
    assert isinstance(gateway, NullLineageGateway)
    char = gateway.seed_character(
        "hero", "SirHero", items=[GameItem(6579, "Espada", 1, 0), GameItem(6579, "Espada", 1, 20)]
    )
    url = "/api/v1/customer/inventory/withdraw/"

    mixed = api.post(url, {"char_id": char.char_id, "item_id": 6579, "quantity": 2, "enchant": 20}, format="json")
    assert mixed.status_code == 400
    negative = api.post(url, {"char_id": char.char_id, "item_id": 6579, "quantity": 1, "enchant": -1}, format="json")
    assert negative.status_code == 400
    high = api.post(url, {"char_id": char.char_id, "item_id": 6579, "quantity": 1, "enchant": 20}, format="json")
    assert high.status_code == 200, high.data
    low = api.post(url, {"char_id": char.char_id, "item_id": 6579, "quantity": 1}, format="json")
    assert low.status_code == 200, low.data

    rows = InventoryItem.objects.filter(user=player, item_id=6579)
    assert sorted(rows.values_list("enchant", "quantity")) == [(0, 1), (20, 1)]
    assert gateway.list_character_items(char.char_id) == []
