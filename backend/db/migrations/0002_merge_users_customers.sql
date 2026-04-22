-- Migration 0002: Merge customers table into users table
-- 1:1 relationship — one customer = one user. No need for two tables.
-- Pre-condition: 0 real production data (test artifacts only).
-- Note: migration 0001 added base_user_id to customers (now dropped),
-- so this migration re-adds it to users.

-- 1. Add business columns to users (from customers)
ALTER TABLE users ADD COLUMN base_user_id text UNIQUE;
ALTER TABLE users ADD COLUMN company_name text;
ALTER TABLE users ADD COLUMN target_accounting_system text;

-- 2. Make browser_token nullable (Base-synced users start without one)
ALTER TABLE users ALTER COLUMN browser_token DROP NOT NULL;

-- 3. Drop the customer_id FK column (no longer needed)
ALTER TABLE users DROP COLUMN customer_id;

-- 4. Drop the customers table
DROP TABLE IF EXISTS customers;

-- 5. Index for Base user lookups
CREATE INDEX idx_users_base_user_id ON users(base_user_id);
