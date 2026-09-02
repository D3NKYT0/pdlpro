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
SELECT object_id AS stack_id, count AS quantity FROM items WHERE owner_id=:char_id AND item_id=:item_id AND enchant_level=0 AND loc IN ('INVENTORY', 'WAREHOUSE') ORDER BY object_id FOR UPDATE

-- name: exchange_decrement
UPDATE items SET count=count-:qty WHERE object_id=:stack_id AND owner_id=:char_id AND count>=:qty

-- name: exchange_delete_empty
DELETE FROM items WHERE object_id=:stack_id AND owner_id=:char_id AND count=0
