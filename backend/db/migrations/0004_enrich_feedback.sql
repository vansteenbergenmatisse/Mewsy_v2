-- Migration 0004: Enrich feedback table with context columns
-- Makes bundle_id nullable (feedback can be saved even if bundle flush hasn't completed),
-- changes ON DELETE CASCADE → ON DELETE SET NULL (keep feedback if bundle is cleaned up),
-- and adds context columns so feedback rows are self-contained for analytics.

-- 1. Make bundle_id nullable and change delete behavior
ALTER TABLE feedback ALTER COLUMN bundle_id DROP NOT NULL;
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_bundle_id_fkey;
ALTER TABLE feedback ADD CONSTRAINT feedback_bundle_id_fkey
  FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE SET NULL;

-- 2. Replace UNIQUE constraint with partial index (NULL bundle_ids don't conflict)
ALTER TABLE feedback DROP CONSTRAINT IF EXISTS feedback_bundle_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS feedback_bundle_id_unique
  ON feedback (bundle_id) WHERE bundle_id IS NOT NULL;

-- 3. Context columns
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS original_question text;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS answer_text text;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS conversation_history jsonb;
