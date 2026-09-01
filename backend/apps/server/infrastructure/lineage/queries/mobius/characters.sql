-- Mobius — personagens (PK obj_Id, nível/classe em character_subclasses).

-- name: list_characters
SELECT
    C.obj_Id AS char_id,
    C.char_name AS name,
    COALESCE(CS.level, 0) AS level,
    C.online,
    C.sex,
    C.pvpkills AS pvp,
    C.pkkills AS pk,
    COALESCE(CS.class_id, 0) AS class_id
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
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
    COALESCE(CS.class_id, 0) AS class_id
FROM characters C
LEFT JOIN character_subclasses CS ON CS.char_obj_id = C.obj_Id AND CS.isBase = '1'
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
WHERE obj_Id = :cid

-- name: find_character_id_by_name
SELECT obj_Id AS char_id
FROM characters
WHERE char_name = :name
LIMIT 1
