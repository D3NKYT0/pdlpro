-- Lucera v2 — personagens (PK obj_Id, level/classe em character_subclasses).

-- name: list_characters
SELECT
    C.obj_Id AS char_id,
    C.char_name AS name,
    COALESCE(CS.level, 0) AS level,
    C.online,
    C.sex,
    C.pvpkills AS pvp,
    C.pkkills AS pk,
    COALESCE(CS.class_id, 0) AS class_id,
    COALESCE(C.title, '') AS title,
    COALESCE(D.name, '') AS clan_name,
    CASE WHEN D.leader_id = C.obj_Id THEN 1 ELSE 0 END AS is_clan_leader,
    COALESCE(C.karma, 0) AS karma,
    COALESCE(I.adenas, 0) AS adena,
    COALESCE(C.onlinetime, 0) AS online_time,
    COALESCE(C.lastAccess, 0) AS last_access,
    COALESCE(C.clanid, 0) AS clan_id,
    COALESCE(CD.ally_id, 0) AS ally_id,
    COALESCE(A.ally_name, '') AS ally_name,
    CD.crest AS clan_crest,
    A.crest AS ally_crest,
    COALESCE(C.hairStyle, 0) AS hair_style,
    COALESCE(C.hairColor, 0) AS hair_color,
    COALESCE(C.face, 0) AS face
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
LEFT JOIN clan_data CD ON CD.clan_id = C.clanid
LEFT JOIN ally_data A ON A.ally_id = CD.ally_id
LEFT JOIN (
    SELECT owner_id, SUM(amount) AS adenas
    FROM items
    WHERE item_type = '57'
    GROUP BY owner_id
) I ON I.owner_id = C.obj_Id
WHERE C.account_name = :login
ORDER BY CS.level DESC, C.char_name ASC

-- name: get_character
SELECT
    C.obj_Id AS char_id,
    C.char_name AS name,
    COALESCE(CS.level, 0) AS level,
    C.online,
    C.sex,
    C.pvpkills AS pvp,
    C.pkkills AS pk,
    COALESCE(CS.class_id, 0) AS class_id,
    COALESCE(C.title, '') AS title,
    COALESCE(D.name, '') AS clan_name,
    CASE WHEN D.leader_id = C.obj_Id THEN 1 ELSE 0 END AS is_clan_leader,
    COALESCE(C.karma, 0) AS karma,
    COALESCE(I.adenas, 0) AS adena,
    COALESCE(C.onlinetime, 0) AS online_time,
    COALESCE(C.lastAccess, 0) AS last_access,
    COALESCE(C.clanid, 0) AS clan_id,
    COALESCE(CD.ally_id, 0) AS ally_id,
    COALESCE(A.ally_name, '') AS ally_name,
    CD.crest AS clan_crest,
    A.crest AS ally_crest,
    COALESCE(C.hairStyle, 0) AS hair_style,
    COALESCE(C.hairColor, 0) AS hair_color,
    COALESCE(C.face, 0) AS face
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
LEFT JOIN clan_subpledges D ON D.clan_id = C.clanid AND D.type = '0'
LEFT JOIN clan_data CD ON CD.clan_id = C.clanid
LEFT JOIN ally_data A ON A.ally_id = CD.ally_id
LEFT JOIN (
    SELECT owner_id, SUM(amount) AS adenas
    FROM items
    WHERE item_type = '57'
    GROUP BY owner_id
) I ON I.owner_id = C.obj_Id
WHERE C.account_name = :login AND C.obj_Id = :char_id
LIMIT 1

-- name: nickname_exists
SELECT C.obj_Id AS char_id
FROM characters C
WHERE C.char_name = :name
LIMIT 1

-- name: change_nickname
UPDATE characters
SET char_name = :name
WHERE obj_Id = :cid AND account_name = :login
LIMIT 1

-- name: change_sex
UPDATE characters
SET sex = :sex
WHERE obj_Id = :cid AND account_name = :login
LIMIT 1

-- name: unstuck
UPDATE characters
SET x = :x, y = :y, z = :z
WHERE obj_Id = :cid AND account_name = :login
LIMIT 1

-- name: count_characters
SELECT COUNT(*) AS total
FROM characters
WHERE account_name = :login

-- name: verify_character_ownership
SELECT COUNT(*) AS total
FROM characters
WHERE obj_Id = :char_id AND account_name = :login

-- name: transfer_character
UPDATE characters
SET account_name = :acc
WHERE obj_Id = :cid AND account_name = :from_acc

-- name: find_character_id_by_name
SELECT obj_Id AS char_id
FROM characters
WHERE char_name = :name
LIMIT 1

-- name: change_appearance
UPDATE characters
SET hairStyle = :hair_style, hairColor = :hair_color, face = :face
WHERE obj_Id = :cid AND account_name = :login
LIMIT 1

-- name: clear_karma
UPDATE characters
SET karma = 0
WHERE obj_Id = :cid AND account_name = :login
LIMIT 1

-- name: clear_pk
UPDATE characters
SET pkkills = 0
WHERE obj_Id = :cid AND account_name = :login
LIMIT 1

-- name: max_character_id
SELECT COALESCE(MAX(obj_Id), 268435456) AS max_id
FROM characters

-- name: insert_character
INSERT INTO characters (
    obj_Id, account_name, char_name, face, hairStyle, hairColor, sex, x, y, z, createtime
) VALUES (
    :char_id, :login, :name, :face, :hair_style, :hair_color, :sex, :x, :y, :z, UNIX_TIMESTAMP()
)

-- name: insert_character_subclass
INSERT INTO character_subclasses (
    char_obj_id, class_id, level, exp, sp, curHp, curMp, curCp, maxHp, maxMp, maxCp, active, isBase, death_penalty
) VALUES (
    :char_id, :class_id, :level, 0, 0, 100, 100, 100, 100, 100, 100, 1, 1, 0
)

