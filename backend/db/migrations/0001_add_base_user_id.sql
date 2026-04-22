-- Migration 0001: Add base_user_id column to customers table
-- Links Mewsie customers to their identity in Base (Omniboost's main product).
-- A Base user IS a customer — one base_user_id per customer row.
-- Run in Supabase SQL Editor.

ALTER TABLE customers ADD COLUMN base_user_id text UNIQUE;
CREATE INDEX idx_customers_base_user_id ON customers(base_user_id);
