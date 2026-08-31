-- Lucera v2 — mundo: olimpíada, bosses, siege, busca, clans.

-- name: olympiad_ranking
SELECT
    C.char_name AS name,
    O.points_current AS value,
    C.online,
    D.name AS clan_name,
    CS.class_id AS class_id
FROM oly_nobles O
LEFT JOIN characters C ON C.obj_Id = O.char_id
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
ORDER BY O.points_current DESC, CS.class_id ASC, C.char_name ASC

-- name: olympiad_all_heroes
SELECT
    C.char_name AS name,
    H.count AS value,
    C.online,
    D.name AS clan_name,
    CS.class_id AS class_id
FROM oly_heroes H
LEFT JOIN characters C ON C.obj_Id = H.char_id
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE H.played > 0 AND H.count > 0
ORDER BY H.count DESC, CS.class_id ASC, C.char_name ASC

-- name: olympiad_current_heroes
SELECT
    C.char_name AS name,
    CS.class_id AS value,
    C.online,
    D.name AS clan_name
FROM oly_heroes H
LEFT JOIN characters C ON C.obj_Id = H.char_id
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE H.played > 0 AND H.count > 0
ORDER BY CS.class_id ASC

-- name: grandboss_status
SELECT bossId AS boss_id, respawnDate AS respawn
FROM epic_boss_spawn
ORDER BY respawnDate DESC

-- name: siege
SELECT
    W.id AS castle_id,
    W.name AS name,
    W.siege_date AS sdate,
    W.treasury AS stax,
    P.char_name AS leader,
    CS.name AS clan_name,
    C.clan_id,
    A.ally_name
FROM castle W
LEFT JOIN clan_data C ON C.hasCastle = W.id
LEFT JOIN clan_subpledges CS ON CS.clan_id = C.clan_id AND CS.type = '0'
LEFT JOIN ally_data A ON A.ally_id = C.ally_id
LEFT JOIN characters P ON P.obj_Id = CS.leader_id

-- name: siege_participants
SELECT
    S.type,
    C.name AS clan_name,
    C.clan_id
FROM siege_clans S
LEFT JOIN clan_subpledges C ON C.clan_id = S.clan_id AND C.type = '0'
WHERE S.residence_id = :castle_id

-- name: search_characters
SELECT
    C.obj_Id AS char_id,
    C.char_name AS name,
    CS.level AS value,
    CS.class_id AS class_id,
    C.online,
    D.name AS clan_name
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE C.accesslevel = '0' AND C.char_name LIKE :query
ORDER BY CS.level DESC, C.char_name ASC
LIMIT :limit

-- name: get_clan_details
SELECT
    C.clan_id,
    S.name AS clan_name,
    C.clan_level AS level,
    C.reputation_score AS reputation,
    C.ally_id,
    (SELECT COUNT(*) FROM characters WHERE clanid = C.clan_id) AS member_count
FROM clan_data C
LEFT JOIN clan_subpledges S ON S.clan_id = C.clan_id AND S.type = '0'
WHERE S.name = :clan_name
LIMIT 1

-- name: clan_members
SELECT
    C.char_name AS name,
    C.online,
    C.pvpkills AS pvp,
    C.pkkills AS pk,
    (SELECT S0.level FROM character_subclasses AS S0 WHERE S0.char_obj_id = C.obj_Id AND S0.isBase = '1' LIMIT 1) AS level,
    (SELECT S0.class_id FROM character_subclasses AS S0 WHERE S0.char_obj_id = C.obj_Id AND S0.isBase = '1' LIMIT 1) AS class_id
FROM characters C
WHERE C.clanid = :clan_id
ORDER BY C.online DESC, level DESC, C.char_name ASC
