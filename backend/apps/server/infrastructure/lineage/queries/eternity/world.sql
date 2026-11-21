-- Eternity — olimpíada, bosses, castelos, busca e clãs.

-- name: olympiad_ranking
SELECT
    C.char_name AS name,
    O.olympiad_points AS value,
    C.online,
    D.clan_name,
    O.class_id,
    C.sex
FROM olympiad_nobles O
JOIN characters C ON C.charId = O.charId
LEFT JOIN clan_data D ON D.clan_id = C.clanid
ORDER BY O.olympiad_points DESC, O.class_id ASC, C.char_name ASC

-- name: olympiad_all_heroes
SELECT
    C.char_name AS name,
    H.count AS value,
    C.online,
    D.clan_name,
    H.class_id,
    C.sex
FROM heroes H
JOIN characters C ON C.charId = H.charId
LEFT JOIN clan_data D ON D.clan_id = C.clanid
WHERE H.played > 0 AND H.count > 0
ORDER BY H.count DESC, H.class_id ASC, C.char_name ASC

-- name: olympiad_current_heroes
SELECT
    C.char_name AS name,
    H.class_id AS value,
    C.online,
    D.clan_name
FROM heroes H
JOIN characters C ON C.charId = H.charId
LEFT JOIN clan_data D ON D.clan_id = C.clanid
WHERE H.active > 0
ORDER BY H.class_id ASC, C.char_name ASC

-- name: grandboss_status
SELECT boss_id, respawn_time AS respawn
FROM grandboss_data
ORDER BY respawn_time DESC

-- name: raidboss_status
SELECT boss_id, respawn_time AS respawn
FROM raidboss_status
ORDER BY respawn_time DESC

-- name: siege
SELECT
    W.id AS castle_id,
    W.name,
    W.siegeDate AS sdate,
    W.treasury AS stax,
    COALESCE(W.taxPercent, 0) AS tax,
    P.char_name AS leader,
    C.clan_name,
    C.clan_id,
    C.ally_name
FROM castle W
LEFT JOIN clan_data C ON C.hasCastle = W.id
LEFT JOIN characters P ON P.charId = C.leader_id

-- name: siege_participants
SELECT S.type, C.clan_name, C.clan_id
FROM siege_clans S
JOIN clan_data C ON C.clan_id = S.clan_id
WHERE S.castle_id = :castle_id

-- name: search_characters
SELECT
    C.charId AS char_id,
    C.char_name AS name,
    C.level AS value,
    C.classid AS class_id,
    C.sex,
    C.online,
    D.clan_name
FROM characters C
LEFT JOIN clan_data D ON D.clan_id = C.clanid
WHERE C.accesslevel = 0 AND C.char_name LIKE :query
ORDER BY C.level DESC, C.char_name ASC
LIMIT :limit

-- name: get_clan_details
SELECT
    C.clan_id,
    C.clan_name,
    C.clan_level AS level,
    C.reputation_score AS reputation,
    C.ally_id,
    (SELECT COUNT(*) FROM characters WHERE clanid = C.clan_id) AS member_count
FROM clan_data C
WHERE C.clan_name = :clan_name
LIMIT 1

-- name: clan_members
SELECT
    C.char_name AS name,
    C.online,
    C.pvpkills AS pvp,
    C.pkkills AS pk,
    C.level,
    C.classid AS class_id
FROM characters C
WHERE C.clanid = :clan_id
ORDER BY C.online DESC, C.level DESC, C.char_name ASC
