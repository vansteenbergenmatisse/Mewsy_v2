/**
 * types.ts — TypeScript interfaces for all 9 database tables.
 * Used by turn-buffer.ts, identity.ts, and the feedback endpoint.
 */

export interface UserRow {
  id: string;
  browser_token: string | null;
  base_user_id: string | null;
  company_name: string | null;
  tier: string | null;
  target_accounting_system: string | null;
  derived_country: string | null;
  first_seen: string;
  last_seen: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  frontend_session_id: string;
  language: string | null;
  started_at: string;
  last_active_at: string;
  abandoned: boolean;
}

export interface DocUsedEntry {
  doc_id: string;
  doc_title: string;
  content_hash?: string;
  stage: 'stage1_matched' | 'stage2a_passed' | 'stage2a_failed' | 'answer_loaded';
  keyword_hits?: number;
  stage2a_reasoning?: string;
  stage2a_passes?: boolean;
  timestamp_ms: number;
}

export interface PipelineLogEntry {
  timestamp_ms: number;
  level: 'info' | 'debug' | 'warn' | 'error';
  stage: string;
  message: string;
}

export interface BundleRow {
  id: string;
  conversation_id: string;
  sequence_in_conversation: number;
  original_question: string;
  routing_mode: string | null;
  answer_signal: string | null;
  answer_contract: object | null;
  tier_detected: string | null;
  trigger_reason: string | null;
  is_closed: boolean;
  closure_reason: string | null;
  opened_at: string;
  closed_at: string | null;
  // pipeline trace fields
  stage1_total_docs: number;
  stage1_matched_count: number;
  stage1_gate: string | null;
  stage2a_shortlist_size: number | null;
  stage2a_pass_count: number | null;
  stage2b_decision: string | null;
  stage2b_reason: string | null;
  content_verified_failure: boolean;
  post_answer_lane: string | null;
  skip_routing: boolean;
  frustration_counter: number;
  clarify_round_counter: number;
  detected_tools: string | null;
  detected_setup_type: string | null;
  qa_log_snapshot: object | null;
  pipeline_log: PipelineLogEntry[] | null;
  docs_used: DocUsedEntry[] | null;
}

export interface MessageRow {
  id: string;
  bundle_id: string;
  conversation_id: string;
  role: 'user' | 'bot';
  content_raw: string;
  sequence_in_bundle: number;
  timestamp_ms: number;
  created_at: string;
}

export interface LlmCallRow {
  id: string;
  bundle_id: string;
  call_type: 'chat' | 'verify_doc' | 'recover_routing' | 'smart_clarify' | 'smart_basic' | 'intro_line';
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_tokens: number | null;
  cache_read_tokens: number | null;
  stop_reason: string | null;
  api_response_id: string | null;
  latency_ms: number;
  retry_count: number;
  error_message: string | null;
  cost_usd: number | null;
  system_prompt_version_hash: string;
  created_at: string;
}

export interface FeedbackRow {
  id: string;
  bundle_id: string;
  vote: 'up' | 'down';
  reason: string | null;
  comment: string | null;
  created_at: string;
}

export interface HelpPanelOpenRow {
  id: string;
  conversation_id: string;
  topic: string;
  opened_at: string;
}

export interface ErrorRow {
  id: string;
  conversation_id: string | null;
  bundle_id: string | null;
  error_type: string;
  message: string;
  stack_trace: string | null;
  session_id_raw: string | null;
  user_message_excerpt: string | null;
  created_at: string;
}
