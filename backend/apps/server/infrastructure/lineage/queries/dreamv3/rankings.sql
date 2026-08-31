-- Dream v3 / L2J — rankings. Colunas estáveis: name, value.

-- name: players_online
SELECT COUNT(*) AS total
FROM characters
WHERE online = 1

-- name: top_pvp
SELECT char_name AS name, pvpkills AS value
FROM characters
WHERE accesslevel = 0
ORDER BY pvpkills DESC
LIMIT :limit

-- name: top_pk
SELECT char_name AS name, pkkills AS value
FROM characters
WHERE accesslevel = 0
ORDER BY pkkills DESC
LIMIT :limit

-- name: top_level
SELECT char_name AS name, level AS value
FROM characters
WHERE accesslevel = 0
ORDER BY exp DESC
LIMIT :limit

-- name: top_online
SELECT char_name AS name, onlinetime AS value
FROM characters
WHERE accesslevel = 0
ORDER BY onlinetime DESC
LIMIT :limit

-- name: top_clans
SELECT clan_name AS name, reputation_score AS value
FROM clan_data
ORDER BY reputation_score DESC
LIMIT :limit

-- name: top_adena
SELECT c.char_name AS name, COALESCE(i.count, 0) AS value
FROM characters c
LEFT JOIN items i ON i.owner_id = c.charId AND i.item_id = 57
WHERE c.accesslevel = 0
ORDER BY value DESC
LIMIT :limit
