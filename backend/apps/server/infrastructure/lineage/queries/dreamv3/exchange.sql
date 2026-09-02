-- Durable receipt and transaction-local coin queries. Install with prepare_game_exchange.
-- name: exchange_create_receipts
CREATE TABLE IF NOT EXISTS pdl_exchange_receipts (receipt VARCHAR(36) PRIMARY KEY, completed TINYINT NOT NULL DEFAULT 0) ENGINE=InnoDB

-- name: exchange_insert_receipt
INSERT INTO pdl_exchange_receipts (receipt, completed) VALUES (:receipt, 0) ON DUPLICATE KEY UPDATE receipt=VALUES(receipt)

-- name: exchange_get_receipt
SELECT completed FROM pdl_exchange_receipts WHERE receipt=:receipt FOR UPDATE

-- name: exchange_complete_receipt
UPDATE pdl_exchange_receipts SET completed=1 WHERE receipt=:receipt

-- name: exchange_character
SELECT obj_Id AS char_id, char_name AS name, online FROM characters WHERE obj_Id=:char_id AND account_name=:login FOR UPDATE

-- name: exchange_stacks
SELECT item_id AS stack_id, amount AS quantity FROM items WHERE owner_id=:char_id AND item_type=:item_id AND enchant=0 AND location IN ('INVENTORY', 'WAREHOUSE') ORDER BY item_id FOR UPDATE

-- name: exchange_decrement
UPDATE items SET amount=amount-:qty WHERE item_id=:stack_id AND owner_id=:char_id AND amount>=:qty

-- name: exchange_delete_empty
DELETE FROM items WHERE item_id=:stack_id AND owner_id=:char_id AND amount=0
