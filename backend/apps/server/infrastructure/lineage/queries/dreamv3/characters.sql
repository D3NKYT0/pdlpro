-- Dream v3 / L2J — personagens (PK charId).

-- name: list_characters
SELECT
    charId AS char_id,
    char_name AS name,
    level,
    online,
    sex,
    pvpkills AS pvp,
    pkkills AS pk,
    classid AS class_id
FROM characters
WHERE account_name = :login

-- name: get_character
SELECT
    charId AS char_id,
    char_name AS name,
    level,
    online,
    sex,
    pvpkills AS pvp,
    pkkills AS pk,
    classid AS class_id
FROM characters
WHERE account_name = :login AND charId = :char_id
LIMIT 1

-- name: nickname_exists
SELECT charId AS char_id
FROM characters
WHERE char_name = :name
LIMIT 1

-- name: change_nickname
UPDATE characters
SET char_name = :name
WHERE charId = :cid AND account_name = :login

-- name: change_sex
UPDATE characters
SET sex = :sex
WHERE charId = :cid AND account_name = :login

-- name: unstuck
UPDATE characters
SET x = :x, y = :y, z = :z
WHERE charId = :cid AND account_name = :login

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
WHERE charId = :cid

-- name: find_character_id_by_name
SELECT charId AS char_id
FROM characters
WHERE char_name = :name
LIMIT 1
