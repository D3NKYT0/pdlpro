-- Dream v3 / L2J — itens.

-- name: list_character_items
SELECT item_type AS item_id, amount AS quantity, enchant
FROM items
WHERE owner_id = :char_id AND loc IN ('INVENTORY', 'WAREHOUSE')

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
INSERT INTO items_delayed (owner_name, item_id, count, enchant, description)
VALUES (:name, :item_id, :qty, :enchant, 'DONATE WEB')
