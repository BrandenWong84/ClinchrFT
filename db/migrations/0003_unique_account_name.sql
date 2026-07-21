-- Migration 0003: Add unique index on accounts.name to prevent duplicate account names
-- This migration makes the accounts.name column unique via a unique index.
BEGIN TRANSACTION;

-- Remove duplicate account rows keeping the first row per name (by rowid).
DELETE FROM accounts
WHERE rowid NOT IN (
	SELECT MIN(rowid) FROM accounts GROUP BY name
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);

COMMIT;
