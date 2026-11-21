-- Eternity — ranking com as colunas name e value.

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
    C.level,
    C.classid AS class_id,
    C.sex AS sex,
    D.clan_name AS clan_name
FROM characters C
LEFT JOIN clan_data D ON D.clan_id = C.clanid
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
    C.level,
    C.classid AS class_id,
    C.sex AS sex,
    D.clan_name AS clan_name
FROM characters C
LEFT JOIN clan_data D ON D.clan_id = C.clanid
WHERE C.accesslevel = '0'
ORDER BY C.pkkills DESC, C.pvpkills DESC, C.onlinetime DESC, C.char_name ASC
LIMIT :limit

-- name: top_level
SELECT
    C.char_name AS name,
    C.level AS value,
    C.pvpkills,
    C.pkkills,
    C.online,
    C.onlinetime,
    C.classid AS class_id,
    C.sex AS sex,
    D.clan_name AS clan_name
FROM characters C
LEFT JOIN clan_data D ON D.clan_id = C.clanid
WHERE C.accesslevel = '0'
ORDER BY C.level DESC, C.onlinetime DESC, C.char_name ASC
LIMIT :limit

-- name: top_online
SELECT
    C.char_name AS name,
    C.onlinetime AS value,
    C.pvpkills,
    C.pkkills,
    C.online,
    C.level,
    C.classid AS class_id,
    C.sex AS sex,
    D.clan_name AS clan_name
FROM characters C
LEFT JOIN clan_data D ON D.clan_id = C.clanid
WHERE C.accesslevel = '0'
ORDER BY C.onlinetime DESC, C.pvpkills DESC, C.pkkills DESC, C.char_name ASC
LIMIT :limit

-- name: top_clans
SELECT
    C.clan_name AS name,
    C.reputation_score AS value,
    C.clan_level,
    C.ally_name,
    P.char_name AS leader,
    (SELECT COUNT(*) FROM characters WHERE clanid = C.clan_id) AS members
FROM clan_data C
LEFT JOIN characters P ON P.charId = C.leader_id
ORDER BY C.clan_level DESC, C.reputation_score DESC, members DESC
LIMIT :limit

-- name: top_adena
SELECT
    C.char_name AS name,
    COALESCE((
        SELECT SUM(I.count)
        FROM items I
        WHERE I.owner_id = C.charId AND I.item_id = 57
          AND I.loc IN ('INVENTORY', 'WAREHOUSE')
    ), 0) AS value,
    C.online,
    C.onlinetime,
    C.level,
    C.classid AS class_id,
    C.sex AS sex,
    D.clan_name AS clan_name
FROM characters C
LEFT JOIN clan_data D ON D.clan_id = C.clanid
WHERE C.accesslevel = '0'
ORDER BY value DESC, C.onlinetime DESC, C.char_name ASC
LIMIT :limit
