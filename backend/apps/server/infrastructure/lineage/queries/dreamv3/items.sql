-- Dream v3 (l2jdreamv3): item_id identifies a stack; item_type is the template.

-- name: list_character_items
SELECT item_type AS item_id, amount AS quantity, enchant
FROM items
WHERE owner_id = :char_id AND location IN ('INVENTORY', 'WAREHOUSE')
ORDER BY item_id

-- name: list_character_equipment
SELECT item_type AS item_id, amount AS quantity, enchant, slot
FROM items
WHERE owner_id = :char_id AND location = 'PAPERDOLL'
ORDER BY slot, item_id

-- name: delete_item_stack
DELETE FROM items
WHERE owner_id = :char_id AND item_type = :item_id AND enchant = :enchant
  AND location IN ('INVENTORY', 'WAREHOUSE')
ORDER BY item_id
LIMIT 1

-- name: update_item_amount
UPDATE items
SET amount = amount - :qty
WHERE owner_id = :char_id AND item_type = :item_id AND enchant = :enchant
  AND location IN ('INVENTORY', 'WAREHOUSE')
ORDER BY item_id
LIMIT 1

-- name: deposit_item
-- payment_id is AUTO_INCREMENT; never allocate it with MAX(payment_id) + 1.
INSERT INTO items_delayed (
    owner_id, item_id, count, enchant_level,
    variationId1, variationId2, attribute, attribute_level,
    flags, payment_status, description
)
VALUES (:owner_id, :item_id, :qty, :enchant, 0, 0, -1, -1, 0, 0, 'DONATE WEB')
