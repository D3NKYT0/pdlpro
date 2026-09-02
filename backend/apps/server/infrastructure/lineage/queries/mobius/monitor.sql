-- Administrative observation only; clan warehouses belong to clans, not characters.
-- name: monitor_items
SELECT /*+ MAX_EXECUTION_TIME(5000) */ i.item_id AS item_id,
       SUM(i.count) AS quantity, COUNT(*) AS instances,
       COUNT(DISTINCT CASE WHEN i.loc = 'CLANWH'
             THEN CONCAT('clan:', i.owner_id) ELSE CONCAT('char:', i.owner_id) END) AS unique_owners
FROM items i
LEFT JOIN characters c ON c.obj_Id = i.owner_id AND i.loc <> 'CLANWH'
LEFT JOIN clan_data cl ON cl.clan_id = i.owner_id AND i.loc = 'CLANWH'
WHERE (i.loc IN ('INVENTORY', 'WAREHOUSE', 'PAPERDOLL') AND c.accesslevel = 0)
   OR (i.loc = 'CLANWH' AND cl.clan_id IS NOT NULL)
GROUP BY i.item_id
ORDER BY quantity DESC, item_id
LIMIT :row_limit

-- name: monitor_details
SELECT /*+ MAX_EXECUTION_TIME(5000) */ i.item_id AS item_id, i.loc AS location,
       SUM(i.count) AS quantity, COUNT(*) AS instances,
       COUNT(DISTINCT i.owner_id) AS unique_owners
FROM items i
LEFT JOIN characters c ON c.obj_Id = i.owner_id AND i.loc <> 'CLANWH'
LEFT JOIN clan_data cl ON cl.clan_id = i.owner_id AND i.loc = 'CLANWH'
WHERE (i.loc IN ('INVENTORY', 'WAREHOUSE', 'PAPERDOLL') AND c.accesslevel = 0)
   OR (i.loc = 'CLANWH' AND cl.clan_id IS NOT NULL)
GROUP BY i.item_id, i.loc
ORDER BY item_id, location
LIMIT :row_limit

-- name: monitor_characters
SELECT /*+ MAX_EXECUTION_TIME(5000) */ COUNT(*) AS total FROM characters WHERE accesslevel = 0
