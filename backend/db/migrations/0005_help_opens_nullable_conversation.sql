-- Migration 0005: Allow help_panel_opens without an existing conversation
-- Users often click help topics BEFORE sending their first message,
-- so no conversation row exists yet. Store session_id directly as fallback.

ALTER TABLE help_panel_opens ALTER COLUMN conversation_id DROP NOT NULL;
ALTER TABLE help_panel_opens ADD COLUMN IF NOT EXISTS session_id text;
