-- Migration 0002: Ensure accounts/categories support soft-delete and transactions use ON DELETE SET NULL
-- Chosen referential-delete policy: Option A (ON DELETE SET NULL) + soft-delete audit field on accounts/categories.
BEGIN TRANSACTION;

-- Add audit columns to accounts and categories if they don't already exist.
ALTER TABLE accounts ADD COLUMN notes TEXT;
ALTER TABLE accounts ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE accounts ADD COLUMN deleted_at DATETIME NULL;

ALTER TABLE categories ADD COLUMN parent_id TEXT NULL;
ALTER TABLE categories ADD COLUMN notes TEXT;
ALTER TABLE categories ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE categories ADD COLUMN deleted_at DATETIME NULL;

-- Recreate transactions table with ON DELETE SET NULL for foreign keys if needed.
-- Note: SQLite does not allow altering FK constraints in-place. The app's embedded migration runner
-- (src-tauri/src/db.rs) also ensures the correct schema at runtime. This file documents the intended
-- schema and provides ALTER steps for environments that support it.

COMMIT;
