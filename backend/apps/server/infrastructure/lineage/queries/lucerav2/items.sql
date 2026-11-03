-- Lucera v2 — itens (item_type / amount / location).

-- name: list_character_items
SELECT item_type AS item_id, amount AS quantity, enchant, location
FROM items
WHERE owner_id = :char_id
  AND location IN ('INVENTORY', 'WAREHOUSE')
ORDER BY location, item_type

-- name: list_character_equipment
SELECT item_type AS item_id, amount AS quantity, enchant, slot
FROM items
WHERE owner_id = :char_id
  AND location = 'PAPERDOLL'
ORDER BY slot, item_type

-- name: list_character_equipment_fallback
SELECT item_type AS item_id, amount AS quantity, enchant, loc_data AS slot
FROM items
WHERE owner_id = :char_id
  AND location = 'PAPERDOLL'
ORDER BY loc_data, item_type


-- name: list_character_skills
SELECT skill_id, skill_level AS level, class_index
FROM character_skills
WHERE char_obj_id = :char_id
ORDER BY skill_id, class_index

-- Withdrawal locks the exact stacks (template + enchant) and consumes each one
-- conditionally inside a single game transaction.
-- The character row is locked offline and owned by the login before any stack moves:
-- removing items from a character that is logged in lets the game server save them back.
-- name: withdraw_character
SELECT obj_Id AS char_id, online FROM characters WHERE obj_Id = :char_id AND account_name = :login FOR UPDATE

-- name: withdraw_stacks
SELECT item_id AS stack_id, amount AS quantity
FROM items
WHERE owner_id = :char_id AND item_type = :item_id AND enchant = :enchant
  AND location IN ('INVENTORY', 'WAREHOUSE')
ORDER BY item_id
FOR UPDATE

-- name: withdraw_decrement
UPDATE items
SET amount = amount - :qty
WHERE item_id = :stack_id AND owner_id = :char_id AND enchant = :enchant
  AND location IN ('INVENTORY', 'WAREHOUSE') AND amount >= :qty

-- name: withdraw_delete_empty
DELETE FROM items
WHERE item_id = :stack_id AND owner_id = :char_id AND amount = 0
  AND location IN ('INVENTORY', 'WAREHOUSE')

-- name: deposit_item
INSERT INTO items_delayed (
    payment_id, owner_id, item_id, count,
    enchant_level, variationId1, variationId2,
    flags, payment_status, description
)
SELECT
    COALESCE(MAX(payment_id), 0) + 1,
    :owner_id, :item_id, :qty,
    :enchant, 0, 0,
    0, 0, 'DONATE WEB'
FROM items_delayed

-- Online delivery capability: this dialect deposits into the game-consumed queue.
-- name: online_delivery_ready
SELECT 1 FROM items_delayed WHERE 1=0

-- name: delivery_character
SELECT obj_Id AS char_id, online FROM characters WHERE char_name=:name FOR UPDATE

-- name: insert_initial_item
INSERT INTO items (item_id, owner_id, item_type, amount, enchant, location, slot)
VALUES (:object_id, :owner_id, :item_id, :quantity, :enchant, :location, :slot)
