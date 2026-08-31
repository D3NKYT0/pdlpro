-- Lucera v2 — itens (item_type / amount / location).

-- name: list_character_items
SELECT item_type AS item_id, amount AS quantity, enchant
FROM items
WHERE owner_id = :char_id
  AND location IN ('INVENTORY', 'WAREHOUSE')
ORDER BY location, item_type

-- name: delete_item_stack
DELETE FROM items
WHERE owner_id = :char_id AND item_type = :item_id AND enchant = :enchant
LIMIT 1

-- name: update_item_amount
UPDATE items
SET amount = amount - :qty
WHERE owner_id = :char_id AND item_type = :item_id AND enchant = :enchant
LIMIT 1

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
