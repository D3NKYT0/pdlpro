-- Dream v3 / L2J — contas.

-- name: get_account
SELECT login, email, linked_uuid
FROM accounts
WHERE login = :login
LIMIT 1

-- name: get_account_password
SELECT password
FROM accounts
WHERE login = :login
LIMIT 1

-- name: register_account
INSERT INTO accounts (login, password, accessLevel, email)
VALUES (:login, :password, 0, :email)

-- name: link_account
UPDATE accounts
SET linked_uuid = :uuid
WHERE login = :login

-- name: unlink_account
UPDATE accounts
SET linked_uuid = NULL
WHERE login = :login

-- name: update_account_password
UPDATE accounts
SET password = :password
WHERE login = :login
