-- Eternity — personagens, classe ativa e alianças.

-- name: list_characters
SELECT
    C.charId AS char_id,
    C.char_name AS name,
    COALESCE(C.level, 0) AS level,
    C.online,
    C.sex,
    C.pvpkills AS pvp,
    C.pkkills AS pk,
    COALESCE(C.classid, 0) AS class_id,
    COALESCE(C.title, '') AS title,
    COALESCE(CD.clan_name, '') AS clan_name,
    CASE WHEN CD.leader_id = C.charId THEN 1 ELSE 0 END AS is_clan_leader,
    COALESCE(C.karma, 0) AS karma,
    COALESCE((
        SELECT SUM(I.count)
        FROM items I
        WHERE I.owner_id = C.charId AND I.item_id = 57
          AND I.loc IN ('INVENTORY', 'WAREHOUSE')
    ), 0) AS adena,
    COALESCE(C.onlinetime, 0) AS online_time,
    COALESCE(C.lastAccess, 0) AS last_access,
    COALESCE(C.clanid, 0) AS clan_id,
    COALESCE(CD.ally_id, 0) AS ally_id,
    COALESCE(CD.ally_name, '') AS ally_name,
    CL.data AS clan_crest,
    AL.data AS ally_crest,
    COALESCE(C.hairStyle, 0) AS hair_style,
    COALESCE(C.hairColor, 0) AS hair_color,
    COALESCE(C.face, 0) AS face
FROM characters C
LEFT JOIN clan_data CD ON CD.clan_id = C.clanid
LEFT JOIN crests CL ON CL.crest_id = CD.crest_id
LEFT JOIN crests AL ON AL.crest_id = CD.ally_crest_id
WHERE C.account_name = :login
ORDER BY C.level DESC, C.char_name ASC

-- name: get_character
SELECT
    C.charId AS char_id,
    C.char_name AS name,
    COALESCE(C.level, 0) AS level,
    C.online,
    C.sex,
    C.pvpkills AS pvp,
    C.pkkills AS pk,
    COALESCE(C.classid, 0) AS class_id,
    COALESCE(C.title, '') AS title,
    COALESCE(CD.clan_name, '') AS clan_name,
    CASE WHEN CD.leader_id = C.charId THEN 1 ELSE 0 END AS is_clan_leader,
    COALESCE(C.karma, 0) AS karma,
    COALESCE((
        SELECT SUM(I.count)
        FROM items I
        WHERE I.owner_id = C.charId AND I.item_id = 57
          AND I.loc IN ('INVENTORY', 'WAREHOUSE')
    ), 0) AS adena,
    COALESCE(C.onlinetime, 0) AS online_time,
    COALESCE(C.lastAccess, 0) AS last_access,
    COALESCE(C.clanid, 0) AS clan_id,
    COALESCE(CD.ally_id, 0) AS ally_id,
    COALESCE(CD.ally_name, '') AS ally_name,
    CL.data AS clan_crest,
    AL.data AS ally_crest,
    COALESCE(C.hairStyle, 0) AS hair_style,
    COALESCE(C.hairColor, 0) AS hair_color,
    COALESCE(C.face, 0) AS face
FROM characters C
LEFT JOIN clan_data CD ON CD.clan_id = C.clanid
LEFT JOIN crests CL ON CL.crest_id = CD.crest_id
LEFT JOIN crests AL ON AL.crest_id = CD.ally_crest_id
WHERE C.account_name = :login AND C.charId = :char_id
LIMIT 1

-- name: nickname_exists
SELECT C.charId AS char_id
FROM characters C
WHERE C.char_name = :name
LIMIT 1

-- name: change_nickname
UPDATE characters
SET char_name = :name
WHERE charId = :cid AND account_name = :login
LIMIT 1

-- name: change_sex
UPDATE characters
SET sex = :sex
WHERE charId = :cid AND account_name = :login
LIMIT 1

-- name: unstuck
UPDATE characters
SET x = :x, y = :y, z = :z
WHERE charId = :cid AND account_name = :login
LIMIT 1

-- name: count_characters
SELECT COUNT(*) AS total
FROM characters
WHERE account_name = :login

-- name: verify_character_ownership
SELECT COUNT(*) AS total
FROM characters
WHERE charId = :char_id AND account_name = :login

-- name: transfer_character
UPDATE characters
SET account_name = :acc
WHERE charId = :cid AND account_name = :from_acc

-- name: find_character_id_by_name
SELECT charId AS char_id
FROM characters
WHERE char_name = :name
LIMIT 1

-- name: change_appearance
UPDATE characters
SET hairStyle = :hair_style, hairColor = :hair_color, face = :face
WHERE charId = :cid AND account_name = :login
LIMIT 1

-- name: clear_karma
UPDATE characters
SET karma = 0
WHERE charId = :cid AND account_name = :login
LIMIT 1

-- name: clear_pk
UPDATE characters
SET pkkills = 0
WHERE charId = :cid AND account_name = :login
LIMIT 1
