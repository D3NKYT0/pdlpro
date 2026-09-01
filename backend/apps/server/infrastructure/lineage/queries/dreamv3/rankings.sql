-- Dream v3 (l2jdreamv3) — rankings. Colunas estáveis: name, value.

-- name: players_online
SELECT COUNT(*) AS total
FROM characters
WHERE online > 0 AND accesslevel = '0'

-- name: top_pvp
SELECT
    C.char_name AS name,
    C.pvpkills AS value,
    C.pkkills,
    C.online,
    C.onlinetime,
    CS.level,
    CS.class_id AS class_id,
    D.name AS clan_name
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE C.accesslevel = '0'
ORDER BY C.pvpkills DESC, C.pkkills DESC, C.onlinetime DESC, C.char_name ASC
LIMIT :limit

-- name: top_pk
SELECT
    C.char_name AS name,
    C.pkkills AS value,
    C.pvpkills,
    C.online,
    C.onlinetime,
    CS.level,
    D.name AS clan_name
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE C.accesslevel = '0'
ORDER BY C.pkkills DESC, C.pvpkills DESC, C.onlinetime DESC, C.char_name ASC
LIMIT :limit

-- name: top_level
SELECT
    C.char_name AS name,
    CS.level AS value,
    C.pvpkills,
    C.pkkills,
    C.online,
    C.onlinetime,
    D.name AS clan_name
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE C.accesslevel = '0'
ORDER BY CS.level DESC, C.onlinetime DESC, C.char_name ASC
LIMIT :limit

-- name: top_online
SELECT
    C.char_name AS name,
    C.onlinetime AS value,
    C.pvpkills,
    C.pkkills,
    C.online,
    CS.level,
    D.name AS clan_name
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE C.accesslevel = '0'
ORDER BY C.onlinetime DESC, C.pvpkills DESC, C.pkkills DESC, C.char_name ASC
LIMIT :limit

-- name: top_clans
SELECT
    D.name AS name,
    C.reputation_score AS value,
    C.clan_level,
    A.ally_name,
    P.char_name AS leader,
    (SELECT COUNT(*) FROM characters WHERE clanid = C.clan_id) AS members
FROM clan_data C
LEFT JOIN clan_subpledges D ON D.clan_id = C.clan_id AND D.type = '0'
LEFT JOIN ally_data A ON A.ally_id = C.ally_id
LEFT JOIN characters P ON P.obj_Id = D.leader_id
ORDER BY C.clan_level DESC, C.reputation_score DESC, members DESC
LIMIT :limit

-- name: top_adena
SELECT
    C.char_name AS name,
    IFNULL(I1.adenas, 0) AS value,
    C.online,
    C.onlinetime,
    CS.level,
    D.name AS clan_name
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
LEFT JOIN (
    SELECT owner_id, SUM(amount) AS adenas
    FROM items
    WHERE item_type = '57'
    GROUP BY owner_id
) I1 ON I1.owner_id = C.obj_Id
WHERE C.accesslevel = '0'
ORDER BY value DESC, C.onlinetime DESC, C.char_name ASC
LIMIT :limit
