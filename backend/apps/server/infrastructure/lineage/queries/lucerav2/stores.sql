-- Lucera v2 — lojas offline (private store). Forks com schema diferente fazem overlay.

-- name: list_private_stores
SELECT
    C.obj_Id AS char_id,
    C.char_name AS name,
    COALESCE(T.type, 1) AS store_type,
    COALESCE(T.title, '') AS title,
    COALESCE(C.x, 0) AS x,
    COALESCE(C.y, 0) AS y,
    COALESCE(C.z, 0) AS z,
    COALESCE(D.name, '') AS clan_name,
    COALESCE(C.sex, 0) AS sex,
    COALESCE(CS.class_id, 0) AS class_id
FROM character_offline_trade T
INNER JOIN characters C ON C.obj_Id = T.charId
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
ORDER BY C.char_name ASC

-- name: list_private_store_items
SELECT
    I.charId AS char_id,
    I.item AS item_id,
    I.count AS quantity,
    I.price AS price,
    COALESCE(I.enchant, 0) AS enchant
FROM character_offline_trade_items I
