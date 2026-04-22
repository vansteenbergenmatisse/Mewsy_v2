/**
 * turn-buffer.ts — Accumulates pipeline events during a single handleMessage() turn
 * and flushes them to Supabase in one transaction at the end.
 *
 * Usage:
 *   const buffer = new TurnBuffer(conversationId);
 *   buffer.openBundle(originalQuestion);
 *   buffer.addMessage('user', userMessage);
 *   buffer.addLlmCall({ ... });
 *   buffer.addDocEvent({ ... });
 *   buffer.log('info', 'stage1', 'Matched 5 docs');
 *   buffer.addMessage('bot', reply);
 *   buffer.updateBundle({ routing_mode: 'ANSWER', ... });
 *   buffer.closeBundle('ANSWER');
 *   await buffer.flush();
 */

import { getSupabase } from './supabase.ts';
import { scrubPII } from './pii-scrubber.ts';
import { ENABLE_DB_WRITES } from '../config/mewsie.config.ts';
import type { DocUsedEntry, PipelineLogEntry } from './types.ts';

// Pricing per 1M tokens (as of 2026-04)
const PRICING: Record<string, { input: number; output: number; cacheRead: number; cacheWrite: number }> = {
  'claude-sonnet-4-6':          { input: 3.00, output: 15.00, cacheRead: 0.30, cacheWrite: 3.75 },
  'claude-haiku-4-5-20251001':  { input: 0.80, output: 4.00,  cacheRead: 0.08, cacheWrite: 1.00 },
};

function computeCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number | null,
  cacheReadTokens: number | null
): number | null {
  const p = PRICING[model];
  if (!p) return null;
  let cost = (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
  if (cacheReadTokens) cost += (cacheReadTokens / 1_000_000) * p.cacheRead;
  if (cacheCreationTokens) cost += (cacheCreationTokens / 1_000_000) * p.cacheWrite;
  return Math.round(cost * 1_000_000) / 1_000_000; // 6 decimal places
}

interface PendingMessage {
  role: 'user' | 'bot';
  content_raw: string;
  timestamp_ms: number;
}

interface PendingLlmCall {
  call_type: string;
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
  system_prompt_version_hash: string;
}

export class TurnBuffer {
  private conversationId: string;
  private bundleId: string | null = null;
  private bundleSequence: number;
  private bundleOriginalQuestion: string = '';
  private bundlePatch: Record<string, unknown> = {};
  private messages: PendingMessage[] = [];
  private llmCalls: PendingLlmCall[] = [];
  private docsUsed: DocUsedEntry[] = [];
  private pipelineLog: PipelineLogEntry[] = [];
  private isClosed = false;
  private closureReason: string | null = null;

  constructor(conversationId: string, bundleSequence: number = 1) {
    this.conversationId = conversationId;
    this.bundleSequence = bundleSequence;
  }

  get currentBundleId(): string | null {
    return this.bundleId;
  }

  /** Opens a new bundle. Returns the bundle ID. */
  openBundle(originalQuestion: string): string {
    this.bundleId = crypto.randomUUID();
    this.bundleOriginalQuestion = originalQuestion;
    this.bundlePatch = {};
    this.messages = [];
    this.llmCalls = [];
    this.docsUsed = [];
    this.pipelineLog = [];
    this.isClosed = false;
    this.closureReason = null;
    return this.bundleId;
  }

  /** Closes the current bundle with a reason. */
  closeBundle(reason: 'ANSWER' | 'ABANDON_IDLE' | 'ABANDON_NEW_QUESTION' | 'SESSION_END'): void {
    this.isClosed = true;
    this.closureReason = reason;
  }

  /** Adds a user or bot message to this turn's buffer. */
  addMessage(role: 'user' | 'bot', content: string): void {
    this.messages.push({
      role,
      content_raw: content,
      timestamp_ms: Date.now(),
    });
  }

  /** Records an LLM API call's metadata. */
  addLlmCall(call: PendingLlmCall): void {
    this.llmCalls.push(call);
  }

  /** Records a document event (Stage 1 match, Stage 2A pass/fail, answer loaded). */
  addDocEvent(entry: DocUsedEntry): void {
    this.docsUsed.push(entry);
  }

  /** Appends a pipeline log entry (replaces console.log in pipeline code). */
  log(level: PipelineLogEntry['level'], stage: string, message: string): void {
    this.pipelineLog.push({ timestamp_ms: Date.now(), level, stage, message });
    // Also write to stdout so terminal output is unchanged
    const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : `[${stage.toUpperCase()}]`;
    console.log(`${prefix} ${message}`);
  }

  /** Merges partial updates into the bundle row (routing_mode, answer_signal, etc.). */
  updateBundle(patch: Record<string, unknown>): void {
    Object.assign(this.bundlePatch, patch);
  }

  /** Flushes all accumulated data to Supabase in batch inserts. */
  async flush(): Promise<void> {
    if (!ENABLE_DB_WRITES || !this.bundleId) return;
    // Guard: don't attempt DB writes with placeholder IDs — they'd cause FK violations
    if (this.conversationId === 'noop' || this.conversationId === 'error') return;

    const supabase = getSupabase();

    // 1. PII-scrub all message content
    for (const msg of this.messages) {
      msg.content_raw = scrubPII(msg.content_raw);
    }

    // 2. Compute LLM costs
    const llmCallsWithCost = this.llmCalls.map(call => ({
      ...call,
      bundle_id: this.bundleId!,
      cost_usd: computeCost(call.model, call.input_tokens, call.output_tokens, call.cache_creation_tokens, call.cache_read_tokens),
    }));

    // 3. Insert/update bundle
    const bundleRow = {
      id: this.bundleId,
      conversation_id: this.conversationId,
      sequence_in_conversation: this.bundleSequence,
      original_question: scrubPII(this.bundleOriginalQuestion),
      is_closed: this.isClosed,
      closure_reason: this.closureReason,
      closed_at: this.isClosed ? new Date().toISOString() : null,
      docs_used: this.docsUsed.length > 0 ? this.docsUsed : null,
      pipeline_log: this.pipelineLog.length > 0 ? this.pipelineLog : null,
      ...this.bundlePatch,
    };

    const { error: bundleErr } = await supabase
      .from('bundles')
      .upsert(bundleRow, { onConflict: 'id' });

    if (bundleErr) {
      console.error('[turn-buffer] bundle upsert failed:', bundleErr.message);
      return; // Don't proceed if bundle failed — FK would break
    }

    // 4. Insert messages
    if (this.messages.length > 0) {
      const messageRows = this.messages.map((msg, idx) => ({
        bundle_id: this.bundleId!,
        conversation_id: this.conversationId,
        role: msg.role,
        content_raw: msg.content_raw,
        sequence_in_bundle: idx + 1,
        timestamp_ms: msg.timestamp_ms,
      }));

      const { error: msgErr } = await supabase.from('messages').insert(messageRows);
      if (msgErr) console.error('[turn-buffer] messages insert failed:', msgErr.message);
    }

    // 5. Insert LLM calls
    if (llmCallsWithCost.length > 0) {
      const { error: llmErr } = await supabase.from('llm_calls').insert(llmCallsWithCost);
      if (llmErr) console.error('[turn-buffer] llm_calls insert failed:', llmErr.message);
    }
  }
}

/**
 * Closes all open bundles for a given frontend session ID.
 * Called from cleanSessions() when a session expires.
 */
export async function closeAbandonedBundles(frontendSessionId: string): Promise<void> {
  if (!ENABLE_DB_WRITES) return;

  const supabase = getSupabase();

  // Find the conversation for this session
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('frontend_session_id', frontendSessionId)
    .single();

  if (!conv) return;

  // Close all open bundles
  await supabase
    .from('bundles')
    .update({
      is_closed: true,
      closure_reason: 'ABANDON_IDLE',
      closed_at: new Date().toISOString(),
    })
    .eq('conversation_id', conv.id)
    .eq('is_closed', false);

  // Mark conversation as abandoned
  await supabase
    .from('conversations')
    .update({ abandoned: true })
    .eq('id', conv.id);
}

/**
 * Logs an error to the errors table.
 * Called from handlePipelineError() in errorHandler.ts.
 */
export async function logErrorToDb(
  errorType: string,
  message: string,
  stackTrace: string | null,
  sessionIdRaw: string | null,
  userMessageExcerpt: string | null,
  conversationId?: string,
  bundleId?: string
): Promise<void> {
  if (!ENABLE_DB_WRITES) return;

  const supabase = getSupabase();
  await supabase.from('errors').insert({
    error_type: errorType,
    message,
    stack_trace: stackTrace,
    session_id_raw: sessionIdRaw,
    user_message_excerpt: userMessageExcerpt ? scrubPII(userMessageExcerpt.slice(0, 200)) : null,
    conversation_id: conversationId || null,
    bundle_id: bundleId || null,
  });
}
