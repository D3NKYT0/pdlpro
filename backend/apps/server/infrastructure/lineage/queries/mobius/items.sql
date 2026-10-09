-- Mobius — itens (item_id / count / enchant_level / loc).

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

-- name: delete_item_stack
DELETE FROM items
WHERE owner_id = :char_id AND item_id = :item_id AND enchant_level = :enchant
LIMIT 1

-- name: update_item_amount
UPDATE items
SET count = count - :qty
WHERE owner_id = :char_id AND item_id = :item_id AND enchant_level = :enchant
LIMIT 1

-- name: deposit_item
INSERT INTO items_delayed (
    owner_id, item_id, count, enchant_level,
    attribute, attribute_level,
    flags, payment_status, description
)
VALUES (
    :owner_id, :item_id, :qty, :enchant,
    -1, -1,
    0, 0, 'DONATE WEB'
)

-- Online delivery capability: this dialect deposits into the game-consumed queue.
-- name: online_delivery_ready
SELECT 1 FROM items_delayed WHERE 1=0

-- name: delivery_character
SELECT obj_Id AS char_id, online FROM characters WHERE char_name=:name FOR UPDATE

-- name: insert_initial_item
INSERT INTO items (object_id, owner_id, item_id, count, enchant_level, loc, loc_data)
VALUES (:object_id, :owner_id, :item_id, :quantity, :enchant, :location, :slot)
