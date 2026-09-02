-- Administrative observation only; clan warehouses belong to clans, not characters.
-- name: monitor_items
SELECT /*+ MAX_EXECUTION_TIME(5000) */ i.item_type AS item_id,
       SUM(i.amount) AS quantity, COUNT(*) AS instances,
       COUNT(DISTINCT CASE WHEN i.location = 'CLANWH'
             THEN CONCAT('clan:', i.owner_id) ELSE CONCAT('char:', i.owner_id) END) AS unique_owners
FROM items i
LEFT JOIN characters c ON c.obj_Id = i.owner_id AND i.location <> 'CLANWH'
LEFT JOIN clan_data cl ON cl.clan_id = i.owner_id AND i.location = 'CLANWH'
WHERE (i.location IN ('INVENTORY', 'WAREHOUSE', 'PAPERDOLL') AND c.accesslevel = 0)
   OR (i.location = 'CLANWH' AND cl.clan_id IS NOT NULL)
GROUP BY i.item_type
ORDER BY quantity DESC, item_id
LIMIT :row_limit

-- name: monitor_details
SELECT /*+ MAX_EXECUTION_TIME(5000) */ i.item_type AS item_id, i.location AS location,
       SUM(i.amount) AS quantity, COUNT(*) AS instances,
       COUNT(DISTINCT i.owner_id) AS unique_owners
FROM items i
LEFT JOIN characters c ON c.obj_Id = i.owner_id AND i.location <> 'CLANWH'
LEFT JOIN clan_data cl ON cl.clan_id = i.owner_id AND i.location = 'CLANWH'
WHERE (i.location IN ('INVENTORY', 'WAREHOUSE', 'PAPERDOLL') AND c.accesslevel = 0)
   OR (i.location = 'CLANWH' AND cl.clan_id IS NOT NULL)
GROUP BY i.item_type, i.location
ORDER BY item_id, location
LIMIT :row_limit

-- name: monitor_characters
SELECT /*+ MAX_EXECUTION_TIME(5000) */ COUNT(*) AS total FROM characters WHERE accesslevel = 0
