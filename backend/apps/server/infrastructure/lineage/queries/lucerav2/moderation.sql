-- Lucera v2 — busca e escritas administrativas de personagens/contas.

-- name: search_moderation_characters
SELECT /*+ MAX_EXECUTION_TIME(5000) */
    C.obj_Id AS char_id,
    C.char_name AS name,
    C.account_name AS login,
    COALESCE(A.email, '') AS email,
    COALESCE(CS.level, 0) AS level,
    C.online,
    C.sex,
    COALESCE(CS.class_id, 0) AS class_id,
    COALESCE(C.title, '') AS title,
    COALESCE(D.name, '') AS clan_name,
    COALESCE(C.pvpkills, 0) AS pvp,
    COALESCE(C.pkkills, 0) AS pk,
    COALESCE(C.karma, 0) AS karma,
    COALESCE(C.onlinetime, 0) AS online_time,
    COALESCE(C.lastAccess, 0) AS last_access,
    COALESCE(A.accessLevel, 0) AS account_access,
    COALESCE(C.accesslevel, 0) AS char_access,
    COALESCE(C.x, 0) AS x,
    COALESCE(C.y, 0) AS y,
    COALESCE(C.z, 0) AS z,
    A.linked_uuid AS linked_uuid
FROM characters C
LEFT JOIN accounts A ON A.login = C.account_name
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE (
    C.char_name LIKE :like
    OR C.account_name LIKE :like
    OR COALESCE(A.email, '') LIKE :like
)
AND (:online_filter < 0 OR C.online = :online_filter)
AND (
    :banned_filter < 0
    OR (:banned_filter = 1 AND COALESCE(A.accessLevel, 0) < 0)
    OR (:banned_filter = 0 AND COALESCE(A.accessLevel, 0) >= 0)
)
ORDER BY C.online DESC, CS.level DESC, C.char_name ASC
LIMIT :limit OFFSET :offset

-- name: count_moderation_characters
SELECT /*+ MAX_EXECUTION_TIME(5000) */ COUNT(*) AS total
FROM characters C
LEFT JOIN accounts A ON A.login = C.account_name
WHERE (
    C.char_name LIKE :like
    OR C.account_name LIKE :like
    OR COALESCE(A.email, '') LIKE :like
)
AND (:online_filter < 0 OR C.online = :online_filter)
AND (
    :banned_filter < 0
    OR (:banned_filter = 1 AND COALESCE(A.accessLevel, 0) < 0)
    OR (:banned_filter = 0 AND COALESCE(A.accessLevel, 0) >= 0)
)

-- name: get_moderation_character
SELECT
    C.obj_Id AS char_id,
    C.char_name AS name,
    C.account_name AS login,
    COALESCE(A.email, '') AS email,
    COALESCE(CS.level, 0) AS level,
    C.online,
    C.sex,
    COALESCE(CS.class_id, 0) AS class_id,
    COALESCE(C.title, '') AS title,
    COALESCE(D.name, '') AS clan_name,
    COALESCE(C.pvpkills, 0) AS pvp,
    COALESCE(C.pkkills, 0) AS pk,
    COALESCE(C.karma, 0) AS karma,
    COALESCE(C.onlinetime, 0) AS online_time,
    COALESCE(C.lastAccess, 0) AS last_access,
    COALESCE(A.accessLevel, 0) AS account_access,
    COALESCE(C.accesslevel, 0) AS char_access,
    COALESCE(C.x, 0) AS x,
    COALESCE(C.y, 0) AS y,
    COALESCE(C.z, 0) AS z,
    A.linked_uuid AS linked_uuid
FROM characters C
LEFT JOIN accounts A ON A.login = C.account_name
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
WHERE C.obj_Id = :char_id
LIMIT 1

-- name: set_account_access_level
UPDATE accounts
SET accessLevel = :level
WHERE login = :login
LIMIT 1

-- name: kick_character
UPDATE characters
SET online = 0
WHERE obj_Id = :cid AND account_name = :login
LIMIT 1
