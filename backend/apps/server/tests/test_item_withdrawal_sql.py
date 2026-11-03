"""LBN-02/LBN-03: retirada do jogo consome pilhas exatas, de forma condicional e atômica.

SQLite valida o algoritmo transacional e o SQL de cada dialeto (sem ``FOR UPDATE``, que o
SQLite não aceita). A homologação ainda exige um teste com personagem offline no MySQL real.
"""

import re

import pytest
from sqlalchemy import create_engine, text

from apps.server.infrastructure.lineage.catalog import LineageQueryCatalog
from apps.server.infrastructure.sqlalchemy_gateway import SqlAlchemyLineageGateway
from common.architecture.exceptions import ValidationDomainError

# O nome exibido do item consulta o catálogo customizado do painel.
pytestmark = pytest.mark.django_db

SCHEMAS = {
    "lucerav2": (
        ("CREATE TABLE items(item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER, "
         "amount INTEGER, enchant INTEGER, location TEXT)"),
        "SELECT item_id, item_type, amount, enchant, location FROM items ORDER BY item_id",
    ),
    "dreamv3": (
        ("CREATE TABLE items(item_id INTEGER PRIMARY KEY, owner_id INTEGER, item_type INTEGER, "
         "amount INTEGER, enchant INTEGER, location TEXT)"),
        "SELECT item_id, item_type, amount, enchant, location FROM items ORDER BY item_id",
    ),
    "mobius": (
        ("CREATE TABLE items(object_id INTEGER PRIMARY KEY, owner_id INTEGER, item_id INTEGER, "
         "count INTEGER, enchant_level INTEGER, loc TEXT)"),
        "SELECT object_id, item_id, count, enchant_level, loc FROM items ORDER BY object_id",
    ),
}
# (stack, owner, template, amount, enchant, location)
ROWS = [
    (1, 1, 6579, 1, 0, "INVENTORY"),
    (2, 1, 6579, 1, 20, "INVENTORY"),
    (3, 1, 57, 5, 0, "INVENTORY"),
    (4, 1, 57, 20, 0, "WAREHOUSE"),
    (5, 1, 57, 99, 0, "PAPERDOLL"),
    (6, 2, 57, 50, 0, "INVENTORY"),
]


def _gateway(dialect: str):
    queries = LineageQueryCatalog.load(dialect)
    queries._statements = dict(queries._statements)
    for name in ("withdraw_stacks", "withdraw_character"):
        queries._statements[name] = re.sub(r"\s+FOR UPDATE\s*$", "", queries[name], flags=re.IGNORECASE)
    create, _ = SCHEMAS[dialect]
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(text(create))
        conn.execute(text("CREATE TABLE characters(obj_Id INTEGER PRIMARY KEY, account_name TEXT, online INTEGER)"))
        conn.execute(text("INSERT INTO characters VALUES (1, 'hero', 0), (2, 'other', 0)"))
        for row in ROWS:
            conn.execute(text("INSERT INTO items VALUES (:a, :b, :c, :d, :e, :f)"), dict(zip("abcdef", row)))
    gateway = SqlAlchemyLineageGateway(queries)
    gateway._engine = engine
    return gateway


def _rows(gateway, dialect):
    with gateway._engine.connect() as conn:
        return [tuple(row) for row in conn.execute(text(SCHEMAS[dialect][1]))]


@pytest.fixture(params=sorted(SCHEMAS))
def dialect(request):
    return request.param


def test_withdraw_keeps_each_enchant_in_its_own_lot(dialect):
    gateway = _gateway(dialect)

    withdrawn = gateway.withdraw_item(1, 6579, 1, 20, "hero")

    assert (withdrawn.item_id, withdrawn.quantity, withdrawn.enchant) == (6579, 1, 20)
    by_stack = {row[0]: row for row in _rows(gateway, dialect)}
    assert by_stack[1] == (1, 6579, 1, 0, "INVENTORY")
    assert 2 not in by_stack


def test_withdraw_never_aggregates_different_enchants(dialect):
    gateway = _gateway(dialect)

    with pytest.raises(ValidationDomainError):
        gateway.withdraw_item(1, 6579, 2, 20, "hero")
    with pytest.raises(ValidationDomainError):
        gateway.withdraw_item(1, 6579, 2, 0, "hero")
    assert len(_rows(gateway, dialect)) == len(ROWS)


def test_withdraw_spans_inventory_and_warehouse_but_not_equipment_or_other_owner(dialect):
    gateway = _gateway(dialect)

    gateway.withdraw_item(1, 57, 15, 0, "hero")

    by_stack = {row[0]: row for row in _rows(gateway, dialect)}
    assert 3 not in by_stack
    assert by_stack[4] == (4, 57, 10, 0, "WAREHOUSE")
    assert 5 in by_stack and 6 in by_stack
    with pytest.raises(ValidationDomainError):
        gateway.withdraw_item(1, 57, 11, 0, "hero")


def test_stale_stack_rolls_back_every_consumed_stack(dialect):
    gateway = _gateway(dialect)
    # Simula outra transação que consumiu a pilha 4 depois da leitura: o UPDATE condicional
    # dessa pilha não encontra a linha, e a pilha 3 já decrementada precisa voltar.
    gateway._sql._statements["withdraw_decrement"] = gateway._sql["withdraw_decrement"] + " AND :stack_id <> 4"
    before = _rows(gateway, dialect)

    with pytest.raises(ValidationDomainError, match="inventário mudou"):
        gateway.withdraw_item(1, 57, 15, 0, "hero")

    assert _rows(gateway, dialect) == before


@pytest.mark.parametrize("cause", ["online", "other_login"])
def test_withdraw_requires_the_character_offline_and_owned_inside_the_transaction(dialect, cause):
    gateway = _gateway(dialect)
    login = "other" if cause == "other_login" else "hero"
    if cause == "online":
        with gateway._engine.begin() as conn:
            conn.execute(text("UPDATE characters SET online = 1 WHERE obj_Id = 1"))

    with pytest.raises(ValidationDomainError, match="online"):
        gateway.withdraw_item(1, 57, 5, 0, login)

    assert len(_rows(gateway, dialect)) == len(ROWS)


@pytest.mark.parametrize("quantity,enchant", [(0, 0), (-1, 0), (1, -1)])
def test_withdraw_rejects_invalid_input_without_touching_the_game(quantity, enchant):
    gateway = _gateway("lucerav2")

    with pytest.raises(ValidationDomainError):
        gateway.withdraw_item(1, 57, quantity, enchant, "hero")
    assert len(_rows(gateway, "lucerav2")) == len(ROWS)


def test_every_dialect_scopes_withdrawal_to_unequipped_locations(dialect):
    catalog = LineageQueryCatalog.load(dialect)
    for name in ("withdraw_stacks", "withdraw_decrement", "withdraw_delete_empty"):
        assert "IN ('INVENTORY', 'WAREHOUSE')" in catalog[name]
        assert ":char_id" in catalog[name]
    assert catalog["withdraw_stacks"].rstrip().upper().endswith("FOR UPDATE")
    assert ">= :qty" in catalog["withdraw_decrement"]
    assert "account_name = :login" in catalog["withdraw_character"]
    assert catalog["withdraw_character"].rstrip().upper().endswith("FOR UPDATE")
