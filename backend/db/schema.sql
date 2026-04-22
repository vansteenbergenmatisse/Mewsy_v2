-- Mewsie Persistence Schema — 8 tables
-- Run in Supabase SQL Editor. Then disable RLS on all tables.

-- 1. users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  browser_token text UNIQUE,             -- nullable: Base-synced users start without one
  base_user_id text UNIQUE,              -- links to user identity in Base (Omniboost main product)
  company_name text,
  tier text,                              -- 'bronze' | 'silver' | 'gold' | null
  target_accounting_system text,
  derived_country text,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_base_user_id ON users(base_user_id);

-- 2. conversations
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  frontend_session_id text NOT NULL,
  language text,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  abandoned boolean NOT NULL DEFAULT false
);
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_frontend_sid ON conversations(frontend_session_id);

-- 3. bundles (extended — absorbs pipeline_traces + doc_events)
CREATE TABLE bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sequence_in_conversation smallint NOT NULL,
  original_question text NOT NULL,
  routing_mode text,
  answer_signal text,
  answer_contract jsonb,
  tier_detected text,
  trigger_reason text,
  is_closed boolean NOT NULL DEFAULT false,
  closure_reason text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  -- pipeline trace fields
  stage1_total_docs integer NOT NULL DEFAULT 0,
  stage1_matched_count integer NOT NULL DEFAULT 0,
  stage1_gate text,
  stage2a_shortlist_size integer,
  stage2a_pass_count integer,
  stage2b_decision text,
  stage2b_reason text,
  content_verified_failure boolean NOT NULL DEFAULT false,
  post_answer_lane text,
  skip_routing boolean NOT NULL DEFAULT false,
  frustration_counter integer NOT NULL DEFAULT 0,
  clarify_round_counter integer NOT NULL DEFAULT 0,
  detected_tools text,
  detected_setup_type text,
  qa_log_snapshot jsonb,
  pipeline_log jsonb,
  docs_used jsonb
);
CREATE INDEX idx_bundles_conversation_id ON bundles(conversation_id);
CREATE INDEX idx_bundles_open ON bundles(is_closed) WHERE is_closed = false;
CREATE INDEX idx_bundles_docs_used ON bundles USING GIN (docs_used);
CREATE INDEX idx_bundles_pipeline_log ON bundles USING GIN (pipeline_log);

-- 4. messages
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL,
  content_raw text NOT NULL,
  sequence_in_bundle smallint NOT NULL,
  timestamp_ms bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_bundle_id ON messages(bundle_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

COMMENT ON TABLE messages IS
  'Individual chat messages. The full conversation is queryable by fetching all messages for a given conversation_id sorted by timestamp_ms. Bundles are an analytical grouping of messages around one question, but the canonical conversation history lives here.';

-- 5. llm_calls
CREATE TABLE llm_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  call_type text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL,
  output_tokens integer NOT NULL,
  cache_creation_tokens integer,
  cache_read_tokens integer,
  stop_reason text,
  api_response_id text,
  latency_ms integer NOT NULL,
  retry_count integer NOT NULL DEFAULT 0,
  error_message text,
  cost_usd numeric(10,6),
  system_prompt_version_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_llm_calls_bundle_id ON llm_calls(bundle_id);
CREATE INDEX idx_llm_calls_model ON llm_calls(model);

-- 6. feedback
CREATE TABLE feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL UNIQUE REFERENCES bundles(id) ON DELETE CASCADE,
  vote text NOT NULL,
  reason text,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. help_panel_opens
CREATE TABLE help_panel_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  topic text NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_help_opens_conversation_id ON help_panel_opens(conversation_id);

-- 8. errors
CREATE TABLE errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  bundle_id uuid REFERENCES bundles(id) ON DELETE SET NULL,
  error_type text NOT NULL,
  message text NOT NULL,
  stack_trace text,
  session_id_raw text,
  user_message_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_errors_created_at ON errors(created_at);

-- Disable RLS on all tables (internal analytics DB, backend-only writes)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE bundles DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE llm_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE help_panel_opens DISABLE ROW LEVEL SECURITY;
ALTER TABLE errors DISABLE ROW LEVEL SECURITY;
