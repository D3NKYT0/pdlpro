-- Eternity — itens (item_id / count / enchant_level / loc).

-- name: list_character_items
SELECT item_id, count AS quantity, enchant_level AS enchant, loc AS location
FROM items
WHERE owner_id = :char_id
  AND loc IN ('INVENTORY', 'WAREHOUSE')
ORDER BY loc, item_id

-- name: list_character_equipment
SELECT item_id, count AS quantity, enchant_level AS enchant, loc_data AS slot
FROM items
WHERE owner_id = :char_id
  AND loc = 'PAPERDOLL'
ORDER BY loc_data

-- name: list_character_skills
SELECT skill_id, skill_level AS level, class_index
FROM character_skills
WHERE charId = :char_id
ORDER BY skill_id, class_index

-- Withdrawal locks the exact stacks (template + enchant) and consumes each one
-- conditionally inside a single game transaction.
-- The character row is locked offline and owned by the login before any stack moves:
-- removing items from a character that is logged in lets the game server save them back.
-- name: withdraw_character
SELECT charId AS char_id, online FROM characters WHERE charId = :char_id AND account_name = :login FOR UPDATE

-- name: withdraw_stacks
SELECT object_id AS stack_id, count AS quantity
FROM items
WHERE owner_id = :char_id AND item_id = :item_id AND enchant_level = :enchant
  AND loc IN ('INVENTORY', 'WAREHOUSE')
ORDER BY object_id
FOR UPDATE

-- name: withdraw_decrement
UPDATE items
SET count = count - :qty
WHERE object_id = :stack_id AND owner_id = :char_id AND enchant_level = :enchant
  AND loc IN ('INVENTORY', 'WAREHOUSE') AND count >= :qty

-- name: withdraw_delete_empty
DELETE FROM items
WHERE object_id = :stack_id AND owner_id = :char_id AND count = 0
  AND loc IN ('INVENTORY', 'WAREHOUSE')
