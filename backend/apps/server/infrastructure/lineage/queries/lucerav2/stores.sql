-- Lucera v2 — lojas offline (private store).
-- Schema primário Lucera 2: character_trade_lists + character_variables (offline, storemode, nomes de placa).
-- Schema alternativo/legado: character_offline_trade + character_offline_trade_items (usado como fallback).

-- name: list_private_stores
SELECT
    C.obj_Id AS char_id,
    C.char_name AS name,
    CASE VM.value
        WHEN '3' THEN 3
        WHEN '4' THEN 4
        WHEN '5' THEN 5
        WHEN '8' THEN 8
        ELSE 1
    END AS store_type,
    COALESCE(
        CASE VM.value
            WHEN '1' THEN VT_SELL.value
            WHEN '3' THEN VT_BUY.value
            WHEN '4' THEN VT_MANUF.value
            ELSE NULL
        END,
        VT_SELL.value,
        VT_BUY.value,
        VT_MANUF.value,
        ''
    ) AS title,
    COALESCE(C.x, 0) AS x,
    COALESCE(C.y, 0) AS y,
    COALESCE(C.z, 0) AS z,
    COALESCE(D.name, '') AS clan_name,
    COALESCE(C.sex, 0) AS sex,
    COALESCE(CS.class_id, 0) AS class_id
FROM characters C
INNER JOIN character_variables VO ON VO.obj_id = C.obj_Id AND VO.type = 'user-var' AND VO.name = 'offline'
INNER JOIN character_variables VM ON VM.obj_id = C.obj_Id AND VM.type = 'user-var' AND VM.name = 'storemode'
LEFT JOIN character_variables VT_SELL ON VT_SELL.obj_id = C.obj_Id AND VT_SELL.type = 'user-var' AND VT_SELL.name = 'sellstorename'
LEFT JOIN character_variables VT_BUY ON VT_BUY.obj_id = C.obj_Id AND VT_BUY.type = 'user-var' AND VT_BUY.name = 'buystorename'
LEFT JOIN character_variables VT_MANUF ON VT_MANUF.obj_id = C.obj_Id AND VT_MANUF.type = 'user-var' AND VT_MANUF.name = 'manufacturename'
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE C.online = 0
  AND EXISTS (
      SELECT 1
      FROM character_trade_lists TL
      WHERE TL.char_id = C.obj_Id
        AND TL.store_type = CASE VM.value WHEN '3' THEN 3 WHEN '4' THEN 4 WHEN '5' THEN 5 WHEN '8' THEN 8 ELSE 1 END
  )
ORDER BY C.char_name ASC

-- name: list_private_store_items
SELECT
    TL.char_id AS char_id,
    TL.item_id AS item_id,
    TL.count AS quantity,
    TL.price AS price,
    COALESCE(TL.enchant, 0) AS enchant
FROM character_trade_lists TL
INNER JOIN characters C ON C.obj_Id = TL.char_id AND C.online = 0
INNER JOIN character_variables VO ON VO.obj_id = C.obj_Id AND VO.type = 'user-var' AND VO.name = 'offline'
INNER JOIN character_variables VM ON VM.obj_id = C.obj_Id AND VM.type = 'user-var' AND VM.name = 'storemode'
WHERE TL.store_type = CASE VM.value WHEN '3' THEN 3 WHEN '4' THEN 4 WHEN '5' THEN 5 WHEN '8' THEN 8 ELSE 1 END
ORDER BY TL.char_id, TL.slot ASC

-- name: list_private_stores_fallback
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

-- name: list_private_store_items_fallback
SELECT
    I.charId AS char_id,
    I.item AS item_id,
    I.count AS quantity,
    I.price AS price,
    COALESCE(I.enchant, 0) AS enchant
FROM character_offline_trade_items I

