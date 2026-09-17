"""Semeia contas, personagens, itens e lojas offline no banco L2 de teste.

Uso (dentro de backend/):

    .\\.venv\\Scripts\\python.exe scripts/seed_demo_offline_stores.py

Idempotente para o prefixo ``pdlshop``. Não altera personagens de outras contas.
"""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
os.chdir(BACKEND)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings.development")

import django

django.setup()

from django.conf import settings
from sqlalchemy import bindparam, create_engine, text

from apps.server.infrastructure.passwords import LineagePasswordHasher

LOGIN_PREFIX = "pdlshop"
PASSWORD = "Test1234"
EMAIL = "pdlshop@pdl.local"
CHAR_ID_BASE = 9_200_100_01
ITEM_ID_BASE = 9_200_200_01
CLAN_ID = 92_001
ALLY_ID = 92_001

TOWNS = {
    "giran": (83400, 147943, -3404),
    "hunter": (117110, 76883, -2695),
    "aden": (146331, 25762, -2018),
    "dwarf": (116551, -182493, -1525),
    "heine": (111409, 219364, -3545),
    "goddard": (147928, -55273, -2728),
    "elven": (45873, 49288, -3058),
    "dark_elf": (12428, 16551, -4588),
    "orc": (-44836, -112524, -235),
}


def lineage_engine():
    user = settings.LINEAGE_DB_USER
    password = settings.LINEAGE_DB_PASSWORD
    host = settings.LINEAGE_DB_HOST
    port = settings.LINEAGE_DB_PORT
    name = settings.LINEAGE_DB_NAME
    url = f"mysql+pymysql://{user}:{password}@{host}:{port}/{name}?charset=utf8mb4"
    return create_engine(url, pool_pre_ping=True)


def describe(connection, table: str) -> list[dict]:
    return [dict(row._mapping) for row in connection.execute(text(f"DESCRIBE `{table}`"))]


def default_for_mysql_type(column_type: str):
    kind = column_type.lower()
    if any(token in kind for token in ("int", "decimal", "float", "double", "bit", "bool")):
        return 0
    if "blob" in kind:
        return None
    return ""


def insert_row(connection, table: str, values: dict) -> None:
    columns = describe(connection, table)
    payload: dict = {}
    for column in columns:
        name = column["Field"]
        extra = (column.get("Extra") or "").lower()
        if "auto_increment" in extra and name not in values:
            continue
        if name in values:
            value = values[name]
            column_type = (column.get("Type") or "").lower()
            if value is not None and any(token in column_type for token in ("date", "time")) and isinstance(value, (int, float)):
                stamp = value / 1000 if value > 10_000_000_000 else value
                value = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stamp))
            payload[name] = value
            continue
        if column.get("Null") == "NO" and column.get("Default") is None and "auto_increment" not in extra:
            payload[name] = default_for_mysql_type(column["Type"])
    if not payload:
        raise RuntimeError(f"Nenhuma coluna para inserir em {table}")
    fields = ", ".join(f"`{name}`" for name in payload)
    binds = ", ".join(f":{name}" for name in payload)
    connection.execute(text(f"INSERT INTO `{table}` ({fields}) VALUES ({binds})"), payload)


def table_names(connection) -> set[str]:
    return {row[0] for row in connection.execute(text("SHOW TABLES"))}


def run_in(connection, sql: str, params: dict):
    statement = text(sql)
    expanding = [key for key, value in params.items() if isinstance(value, (list, tuple))]
    if expanding:
        statement = statement.bindparams(*[bindparam(key, expanding=True) for key in expanding])
    return connection.execute(statement, params)


def ensure_offline_tables(connection) -> None:
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS character_offline_trade (
                charId INT NOT NULL,
                time BIGINT UNSIGNED NOT NULL DEFAULT 0,
                type TINYINT NOT NULL DEFAULT 0,
                title VARCHAR(50) DEFAULT NULL,
                PRIMARY KEY (charId)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
            """
        )
    )
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS character_offline_trade_items (
                charId INT NOT NULL,
                item INT NOT NULL DEFAULT 0,
                count BIGINT UNSIGNED NOT NULL DEFAULT 0,
                price BIGINT UNSIGNED NOT NULL DEFAULT 0,
                enchant INT NOT NULL DEFAULT 0,
                KEY idx_char (charId),
                KEY idx_item (item)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8
            """
        )
    )


def cleanup(connection, names: set[str], count: int) -> None:
    logins = [f"{LOGIN_PREFIX}{index}" for index in range(1, count + 1)]
    char_ids = [CHAR_ID_BASE + index for index in range(count)]
    if "character_offline_trade_items" in names:
        run_in(connection, "DELETE FROM character_offline_trade_items WHERE charId IN :ids", {"ids": char_ids})
    if "character_offline_trade" in names:
        run_in(connection, "DELETE FROM character_offline_trade WHERE charId IN :ids", {"ids": char_ids})
    if "character_skills" in names:
        run_in(connection, "DELETE FROM character_skills WHERE char_obj_id IN :ids", {"ids": char_ids})
    if "items" in names:
        run_in(
            connection,
            "DELETE FROM items WHERE owner_id IN :ids OR item_id BETWEEN :lo AND :hi",
            {"ids": char_ids, "lo": ITEM_ID_BASE, "hi": ITEM_ID_BASE + 400},
        )
    if "character_subclasses" in names:
        run_in(connection, "DELETE FROM character_subclasses WHERE char_obj_id IN :ids", {"ids": char_ids})
    if "characters" in names:
        run_in(
            connection,
            "DELETE FROM characters WHERE obj_Id IN :ids OR account_name IN :logins",
            {"ids": char_ids, "logins": logins},
        )
    if "accounts" in names:
        run_in(connection, "DELETE FROM accounts WHERE login IN :logins", {"logins": logins})
    if "clan_subpledges" in names:
        connection.execute(text("DELETE FROM clan_subpledges WHERE clan_id = :clan_id"), {"clan_id": CLAN_ID})
    if "clan_data" in names:
        connection.execute(text("DELETE FROM clan_data WHERE clan_id = :clan_id"), {"clan_id": CLAN_ID})
    if "ally_data" in names:
        connection.execute(text("DELETE FROM ally_data WHERE ally_id = :ally_id"), {"ally_id": ALLY_ID})


def seed_clan(connection, names: set[str], leader_id: int) -> int:
    if "clan_data" not in names or "clan_subpledges" not in names:
        return 0
    ally_id = ALLY_ID if "ally_data" in names else 0
    if ally_id:
        insert_row(
            connection,
            "ally_data",
            {"ally_id": ALLY_ID, "ally_name": "Aden Vendors"},
        )
    clan = {
        "clan_id": CLAN_ID,
        "clan_level": 5,
        "reputation_score": 4200,
        "ally_id": ally_id,
        "hasCastle": 0,
    }
    insert_row(connection, "clan_data", clan)
    insert_row(
        connection,
        "clan_subpledges",
        {"clan_id": CLAN_ID, "type": 0, "name": "Aden Vendors", "leader_id": leader_id},
    )
    return CLAN_ID


def seed() -> dict:
    if not settings.LINEAGE_DB_ENABLED:
        raise SystemExit("LINEAGE_DB_ENABLED está desligado.")
    hasher = LineagePasswordHasher()
    password_hash = hasher.hash(PASSWORD)
    created_time = int(time.time())
    shops = [
        {
            "login": f"{LOGIN_PREFIX}1",
            "char_id": CHAR_ID_BASE,
            "name": "TraderAnn",
            "title": "SS / BSS",
            "sex": 1,
            "race": 0,
            "class_id": 88,
            "level": 78,
            "pvp": 120,
            "pk": 0,
            "town": "giran",
            "store_type": 1,
            "store_title": "Soulshots D~S",
            "clan": True,
            "paperdoll": [(2, 6373), (7, 6374), (8, 6375), (11, 80)],
            "inventory": [(57, 12_500_000, 0), (1463, 50_000, 0), (1467, 8_000, 0)],
            "store_items": [
                (1463, 5000, 350, 0),
                (1464, 4000, 700, 0),
                (1465, 2500, 1400, 0),
                (1466, 1200, 2800, 0),
                (1467, 400, 5600, 0),
                (3947, 800, 2200, 0),
                (3948, 500, 4400, 0),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}2",
            "char_id": CHAR_ID_BASE + 1,
            "name": "BowMaster",
            "title": "Compro bows",
            "sex": 0,
            "race": 1,
            "class_id": 102,
            "level": 80,
            "pvp": 340,
            "pk": 4,
            "town": "hunter",
            "store_type": 3,
            "store_title": "Compro bows A/S",
            "clan": True,
            "paperdoll": [(7, 2384), (8, 2414), (11, 288)],
            "inventory": [(57, 80_000_000, 0)],
            "store_items": [
                (288, 1, 18_000_000, 0),
                (2507, 1, 45_000_000, 0),
                (7575, 1, 90_000_000, 0),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}3",
            "char_id": CHAR_ID_BASE + 2,
            "name": "AdenaKing",
            "title": "Consumíveis",
            "sex": 0,
            "race": 2,
            "class_id": 110,
            "level": 76,
            "pvp": 55,
            "pk": 1,
            "town": "aden",
            "store_type": 1,
            "store_title": "Pots e scrolls",
            "clan": True,
            "paperdoll": [(1, 512), (2, 2407), (7, 2399)],
            "inventory": [(57, 4_200_000, 0), (1539, 2000, 0), (729, 12, 0)],
            "store_items": [
                (1539, 200, 1200, 0),
                (5592, 150, 3500, 0),
                (1374, 80, 1800, 0),
                (735, 40, 900, 0),
                (729, 3, 1_800_000, 0),
                (730, 8, 420_000, 0),
                (947, 10, 85_000, 0),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}4",
            "char_id": CHAR_ID_BASE + 3,
            "name": "CraftsDwarf",
            "title": "Recipes",
            "sex": 0,
            "race": 4,
            "class_id": 57,
            "level": 74,
            "pvp": 12,
            "pk": 0,
            "town": "dwarf",
            "store_type": 8,
            "store_title": "Craft A-grade",
            "clan": False,
            "paperdoll": [(7, 2383), (11, 2503)],
            "inventory": [(57, 2_000_000, 0), (2133, 40, 0), (1461, 120, 0)],
            "store_items": [
                (2133, 20, 95_000, 0),
                (1461, 50, 22_000, 0),
                (1462, 8, 180_000, 0),
                (4438, 1, 3_500_000, 0),
                (4967, 1, 2_200_000, 0),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}5",
            "char_id": CHAR_ID_BASE + 4,
            "name": "PackSeller",
            "title": "Kits",
            "sex": 1,
            "race": 3,
            "class_id": 51,
            "level": 72,
            "pvp": 88,
            "pk": 0,
            "town": "heine",
            "store_type": 5,
            "store_title": "Kit farm C/B",
            "clan": False,
            "paperdoll": [(7, 356), (8, 2447), (11, 69)],
            "inventory": [(57, 900_000, 0), (1464, 20_000, 0)],
            "store_items": [
                (1464, 2000, 1_200_000, 0),
                (3948, 400, 1_600_000, 0),
                (1539, 100, 110_000, 0),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}6",
            "char_id": CHAR_ID_BASE + 5,
            "name": "BladeGoddard",
            "title": "Armas +16",
            "sex": 0,
            "race": 0,
            "class_id": 90,
            "level": 80,
            "pvp": 910,
            "pk": 22,
            "town": "goddard",
            "store_type": 1,
            "store_title": "Weapons +10/+16",
            "clan": True,
            "paperdoll": [(7, 6373), (11, 8678)],
            "inventory": [(57, 30_000_000, 0), (80, 1, 10), (75, 1, 16)],
            "store_items": [
                (80, 1, 25_000_000, 10),
                (75, 1, 48_000_000, 16),
                (2500, 1, 12_000_000, 8),
                (8678, 1, 95_000_000, 12),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}7",
            "char_id": CHAR_ID_BASE + 6,
            "name": "MoonPriest",
            "title": "Eva",
            "sex": 1,
            "race": 1,
            "class_id": 105,
            "level": 76,
            "pvp": 40,
            "pk": 0,
            "town": "elven",
            "store_type": 1,
            "store_title": "Buffs e pots",
            "clan": False,
            "paperdoll": [(1, 2397), (7, 2392)],
            "inventory": [(57, 1_500_000, 0), (1539, 400, 0)],
            "store_items": [
                (1539, 80, 1100, 0),
                (1375, 40, 2400, 0),
                (6036, 20, 3800, 0),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}8",
            "char_id": CHAR_ID_BASE + 7,
            "name": "NightDancer",
            "title": "Shillien",
            "sex": 1,
            "race": 2,
            "class_id": 107,
            "level": 78,
            "pvp": 210,
            "pk": 8,
            "town": "dark_elf",
            "store_type": 1,
            "store_title": "Dyes e jewels",
            "clan": True,
            "paperdoll": [(7, 2406), (8, 2462)],
            "inventory": [(57, 6_000_000, 0)],
            "store_items": [
                (4481, 4, 220_000, 0),
                (4482, 4, 220_000, 0),
                (919, 1, 8_500_000, 4),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}9",
            "char_id": CHAR_ID_BASE + 8,
            "name": "MiraForge",
            "title": "Smith",
            "sex": 1,
            "race": 4,
            "class_id": 55,
            "level": 70,
            "pvp": 6,
            "pk": 0,
            "town": "dwarf",
            "store_type": 8,
            "store_title": "Recipes B",
            "clan": False,
            "paperdoll": [(7, 2378), (11, 168)],
            "inventory": [(57, 800_000, 0), (1459, 80, 0)],
            "store_items": [
                (1459, 40, 8_000, 0),
                (2132, 15, 28_000, 0),
                (4968, 1, 950_000, 0),
            ],
        },
        {
            "login": f"{LOGIN_PREFIX}10",
            "char_id": CHAR_ID_BASE + 9,
            "name": "TitanBrak",
            "title": "Paagrio",
            "sex": 0,
            "race": 3,
            "class_id": 113,
            "level": 80,
            "pvp": 640,
            "pk": 31,
            "town": "orc",
            "store_type": 1,
            "store_title": "Heavy S-grade",
            "clan": True,
            "paperdoll": [(7, 6373), (11, 80)],
            "inventory": [(57, 18_000_000, 0)],
            "store_items": [
                (6373, 1, 22_000_000, 6),
                (6374, 1, 14_000_000, 6),
                (6375, 1, 14_000_000, 6),
            ],
        },
    ]
    engine = lineage_engine()
    with engine.begin() as connection:
        names = table_names(connection)
        missing = {"accounts", "characters", "items"} - names
        if missing:
            raise SystemExit(f"Schema incompleto: faltam {sorted(missing)}")
        ensure_offline_tables(connection)
        names = table_names(connection)
        cleanup(connection, names, len(shops))
        clan_leader = next(shop["char_id"] for shop in shops if shop["clan"])
        clan_id = seed_clan(connection, names, clan_leader)
        item_id = ITEM_ID_BASE
        for shop in shops:
            x, y, z = TOWNS[shop["town"]]
            insert_row(
                connection,
                "accounts",
                {
                    "login": shop["login"],
                    "password": password_hash,
                    "accessLevel": 0,
                    "email": EMAIL,
                    "created_time": created_time,
                    "linked_uuid": None,
                },
            )
            character = {
                "obj_Id": shop["char_id"],
                "account_name": shop["login"],
                "char_name": shop["name"],
                "level": shop["level"],
                "sex": shop["sex"],
                "face": 1,
                "hairStyle": 2,
                "hairColor": 1,
                "heading": 0,
                "x": x,
                "y": y,
                "z": z,
                "karma": 0,
                "pvpkills": shop["pvp"],
                "pkkills": shop["pk"],
                "clanid": clan_id if shop["clan"] else 0,
                "race": shop["race"],
                "classid": shop["class_id"],
                "base_class": shop["class_id"],
                "title": shop["title"],
                "accesslevel": 0,
                "online": 0,
                "onlinetime": 3600 * (20 + shop["level"]),
                "lastAccess": created_time,
                "exp": 1_000_000_000,
                "sp": 50_000_000,
                "maxHp": 8000,
                "curHp": 8000,
                "maxMp": 4000,
                "curMp": 4000,
                "maxCp": 8000,
                "curCp": 8000,
            }
            insert_row(connection, "characters", character)
            if "character_subclasses" in names:
                insert_row(
                    connection,
                    "character_subclasses",
                    {
                        "char_obj_id": shop["char_id"],
                        "class_id": shop["class_id"],
                        "exp": 1_000_000_000,
                        "sp": 50_000_000,
                        "level": shop["level"],
                        "isBase": 1,
                    },
                )
            if "character_skills" in names:
                for skill_id, level in ((141, 3), (142, 5), (76, 1)):
                    insert_row(
                        connection,
                        "character_skills",
                        {
                            "char_obj_id": shop["char_id"],
                            "skill_id": skill_id,
                            "skill_level": level,
                            "class_index": 0,
                        },
                    )
            for slot, item_type in shop["paperdoll"]:
                insert_row(
                    connection,
                    "items",
                    {
                        "item_id": item_id,
                        "owner_id": shop["char_id"],
                        "item_type": item_type,
                        "amount": 1,
                        "location": "PAPERDOLL",
                        "enchant": 0,
                        "slot": slot,
                    },
                )
                item_id += 1
            for item_type, amount, enchant in shop["inventory"]:
                insert_row(
                    connection,
                    "items",
                    {
                        "item_id": item_id,
                        "owner_id": shop["char_id"],
                        "item_type": item_type,
                        "amount": amount,
                        "location": "INVENTORY",
                        "enchant": enchant,
                        "slot": -1,
                    },
                )
                item_id += 1
            insert_row(
                connection,
                "character_offline_trade",
                {
                    "charId": shop["char_id"],
                    "time": created_time,
                    "type": shop["store_type"],
                    "title": shop["store_title"],
                },
            )
            for item_type, count, price, enchant in shop["store_items"]:
                insert_row(
                    connection,
                    "character_offline_trade_items",
                    {
                        "charId": shop["char_id"],
                        "item": item_type,
                        "count": count,
                        "price": price,
                        "enchant": enchant,
                    },
                )
        listed = run_in(
            connection,
            """
            SELECT C.char_name, T.type, T.title, COUNT(I.item) AS items
            FROM character_offline_trade T
            INNER JOIN characters C ON C.obj_Id = T.charId
            LEFT JOIN character_offline_trade_items I ON I.charId = T.charId
            WHERE T.charId IN :ids
            GROUP BY C.char_name, T.type, T.title
            ORDER BY C.char_name
            """,
            {"ids": [shop["char_id"] for shop in shops]},
        ).mappings().all()
    return {
        "database": settings.LINEAGE_DB_NAME,
        "shops": [dict(row) for row in listed],
        "logins": [shop["login"] for shop in shops],
    }


if __name__ == "__main__":
    result = seed()
    print(f"db={result['database']}")
    print(f"logins={','.join(result['logins'])} password={PASSWORD}")
    for shop in result["shops"]:
        print(f"{shop['char_name']}\ttype={shop['type']}\t{shop['title']}\titems={shop['items']}")
