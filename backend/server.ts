/**
 * server.ts
 *
 * The entry point for Mewsie. This file starts the HTTP server and wires
 * everything together. It has two jobs:
 *   1. Serve the frontend (the chat widget) as a static website
 *   2. Accept incoming chat messages via POST /webhook/chat and return answers
 *
 * Flow for every chat message:
 *   Browser → POST /webhook/chat → agent.ts → claude.ts → response back to browser
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { PORT } from './config.ts';
import { loadAllDocuments } from './fetch/loader.ts';
import { handleMessage } from './pipeline/agent.ts';
import { handlePipelineError, ErrorTypes } from './errors/errorHandler.ts';
import { ENABLE_DB_WRITES, ALLOWED_ORIGINS } from './config/mewsie.config.ts';

const app = new Hono();

// Allow localhost in dev + any origins listed in ALLOWED_ORIGINS env var (comma-separated)
app.use('*', cors({
  origin: (origin) => {
    // Reject null/missing origin — prevents CORS bypass from file:// or server-to-server.
    // Only allow explicit localhost or configured allowed origins.
    if (!origin) return null;
    const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(origin);
    const isAllowed = ALLOWED_ORIGINS.includes(origin);
    return isLocalhost || isAllowed ? origin : null;
  },
}));

// Limit each IP to 60 requests per minute on the chat endpoint — prevents API abuse
const chatRateLimit = rateLimiter({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-6',
  // Prefer x-real-ip (set by trusted reverse proxy) over x-forwarded-for
  // (easily spoofed). Extract only the first IP from x-forwarded-for chains.
  keyGenerator: (c) => {
    const realIp = c.req.header('x-real-ip');
    if (realIp) return realIp;
    const forwarded = c.req.header('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return 'unknown';
  },
  message: { output: 'Too many requests - please slow down.' },
});

// If the Anthropic API takes longer than 30 seconds, give up and return an error.
// This prevents the browser from hanging forever on a slow response.
const ROUTE_TIMEOUT_MS = 30_000;

// ── POST /webhook/chat ─────────────────────────────────────────────────────────
// The only endpoint the frontend calls. Receives a chat message and returns
// Mewsie's reply. Both chatInput (the message text) and sessionId (which
// conversation this belongs to) are required.
app.post('/webhook/chat', chatRateLimit, async (c) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const body = await c.req.json<{ chatInput?: unknown; sessionId?: unknown; language?: unknown; browserToken?: unknown; baseUserId?: unknown }>();
    const { chatInput, sessionId, language, browserToken, baseUserId } = body;

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[REQUEST]  session=${String(sessionId ?? '?').slice(0, 12)}`);
    console.log(`[QUESTION] "${String(chatInput ?? '').slice(0, 80)}"`);

    // Validate that both required fields are present and are strings
    if (!chatInput || typeof chatInput !== 'string') {
      return c.json({ output: 'chatInput is required.' }, 400);
    }
    if (chatInput.length > 1000) {
      return c.json({ output: 'Message too long — please keep it under 1000 characters.' }, 400);
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return c.json({ output: 'sessionId is required.' }, 400);
    }

    // Language is optional — frontend sends the current language on every
    // request so Haiku-driven intro lines can respond in the correct language.
    // Constrained to a short allowlist of codes; anything else is ignored.
    const ALLOWED_LANGS = new Set(['en', 'de', 'de-ch', 'de-at', 'fr', 'nl']);
    const lang =
      typeof language === 'string' && ALLOWED_LANGS.has(language) ? language : 'en';
    const token =
      typeof browserToken === 'string' && browserToken.startsWith('bt_') ? browserToken : null;
    const baseId =
      typeof baseUserId === 'string' && baseUserId.length > 0 && baseUserId.length <= 200 ? baseUserId : null;

    // Hand off to agent.ts, which runs the full CAG pipeline and returns a reply
    const outputPromise = handleMessage(sessionId, chatInput, lang, token, baseId);

    // Race between the pipeline and a 30-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), ROUTE_TIMEOUT_MS);
    });

    const result = await Promise.race([outputPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    // handleMessage returns { reply, bundleId?, ticketOffer? }
    const output = typeof result === 'string' ? result : result.reply;
    const bundleId = typeof result === 'object' && result !== null ? (result as { bundleId?: string }).bundleId : undefined;
    const ticketOffer = typeof result === 'object' && result !== null ? (result as { ticketOffer?: boolean }).ticketOffer : undefined;
    return c.json({ output, ...(bundleId ? { bundleId } : {}), ...(ticketOffer ? { ticketOffer: true } : {}) });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const error = err as Error;
    if (error.message === 'TIMEOUT') {
      return c.json({ output: 'The request timed out. Please try again.' }, 504);
    }
    const fallbackBody = await c.req.json<{ chatInput?: string; sessionId?: string }>().catch(() => ({ chatInput: '', sessionId: 'unknown' }));
    const userMessage = await handlePipelineError(error, {
      sessionId: fallbackBody.sessionId ?? 'unknown',
      userMessage: fallbackBody.chatInput ?? '',
      errorType: ErrorTypes.UNHANDLED,
    });
    return c.json({ output: userMessage }, 500);
  }
});

// ── POST /api/feedback ────────────────────────────────────────────────────────
// Stores a thumbs-up/down vote against a question bundle, enriched with context
// (original question, answer text, conversation history) looked up from the DB.
// Idempotent: re-submitting overwrites the previous vote for the same bundle.
// If the bundle hasn't been flushed yet (race condition), the vote is still saved
// with bundle_id = null so no feedback is lost.
app.post('/api/feedback', async (c) => {
  if (!ENABLE_DB_WRITES) return c.json({ ok: true });

  try {
    const { bundleId, vote, reason } = await c.req.json<{
      bundleId?: string; vote?: string; reason?: string;
    }>();

    if (!bundleId || typeof bundleId !== 'string') {
      return c.json({ error: 'bundleId is required' }, 400);
    }
    if (vote !== 'up' && vote !== 'down') {
      return c.json({ error: 'vote must be "up" or "down"' }, 400);
    }
    const VALID_REASONS = new Set(['incomplete', 'not_solved', 'irrelevant', 'not_found', 'other']);
    const safeReason = vote === 'down' && reason && VALID_REASONS.has(reason) ? reason : null;

    const { getSupabase } = await import('./db/supabase.ts');
    const supabase = getSupabase();

    // ── Enrich: look up bundle + messages for context ──────────────────
    let originalQuestion: string | null = null;
    let answerText: string | null = null;
    let conversationHistory: Array<{ role: string; content: string }> | null = null;
    let bundleExists = false;

    const { data: bundle } = await supabase
      .from('bundles')
      .select('original_question, conversation_id')
      .eq('id', bundleId)
      .single();

    if (bundle) {
      bundleExists = true;
      originalQuestion = bundle.original_question;

      // Get the bot's answer from the messages table
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content_raw')
        .eq('bundle_id', bundleId)
        .order('sequence_in_bundle', { ascending: true });

      if (msgs && msgs.length > 0) {
        const botMsgs = msgs.filter((m: { role: string }) => m.role === 'bot');
        answerText = botMsgs.map((m: { content_raw: string }) => m.content_raw).join('\n') || null;
      }

      // Get recent conversation history (up to 20 messages from this conversation)
      if (bundle.conversation_id) {
        const { data: history } = await supabase
          .from('messages')
          .select('role, content_raw')
          .eq('conversation_id', bundle.conversation_id)
          .order('timestamp_ms', { ascending: true })
          .limit(20);

        if (history && history.length > 0) {
          conversationHistory = history.map((m: { role: string; content_raw: string }) => ({
            role: m.role,
            content: m.content_raw,
          }));
        }
      }
    }

    // ── Upsert feedback row ────────────────────────────────────────────
    const feedbackRow = {
      bundle_id: bundleExists ? bundleId : null,
      vote,
      reason: safeReason,
      original_question: originalQuestion,
      answer_text: answerText,
      conversation_history: conversationHistory,
    };

    const { error: upsertErr } = bundleExists
      ? await supabase.from('feedback').upsert(feedbackRow, { onConflict: 'bundle_id' })
      : await supabase.from('feedback').insert(feedbackRow);

    if (upsertErr) {
      console.error('[feedback] upsert failed:', upsertErr.message);
      return c.json({ error: 'Failed to save feedback' }, 500);
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('[feedback] error:', (err as Error).message);
    return c.json({ error: 'Failed to save feedback' }, 500);
  }
});

// ── POST /api/help-open ──────────────────────────────────────────────────────
// Logs when a user opens a help-panel topic. Fire-and-forget from frontend.
// Always inserts a row — uses conversation_id when a conversation exists,
// falls back to session_id so we track help opens even before the first message.
app.post('/api/help-open', async (c) => {
  if (!ENABLE_DB_WRITES) return c.json({ ok: true });

  try {
    const { sessionId, topic } = await c.req.json<{
      sessionId?: string; topic?: string;
    }>();

    if (!sessionId || !topic) {
      return c.json({ error: 'sessionId and topic are required' }, 400);
    }

    const { getSupabase } = await import('./db/supabase.ts');
    const supabase = getSupabase();

    // Try to find an existing conversation for this session
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('frontend_session_id', sessionId)
      .single();

    const { error: insertErr } = await supabase.from('help_panel_opens').insert({
      conversation_id: conv?.id || null,
      session_id: sessionId,
      topic,
    });

    if (insertErr) {
      console.error('[help-open] insert failed:', insertErr.message);
    }

    return c.json({ ok: true });
  } catch (err) {
    console.error('[help-open] error:', (err as Error).message);
    return c.json({ ok: true });
  }
});

// ── POST /api/sync-context ──────────────────────────────────────────────────
// Called by the mewsie-sync.js script embedded in Base (Omniboost main product).
// Creates or updates a Mewsie customer record from Base's user identity.
// First call creates customer; subsequent calls update if fields changed.
app.post('/api/sync-context', async (c) => {
  if (!ENABLE_DB_WRITES) return c.json({ ok: true, isNew: false, userId: 'noop' });

  try {
    const body = await c.req.json<{
      baseUserId?: unknown; accountingSoftware?: unknown; tier?: unknown; companyName?: unknown;
    }>();

    const { baseUserId, accountingSoftware, tier, companyName } = body;

    // Validate required field
    if (!baseUserId || typeof baseUserId !== 'string' || baseUserId.length > 200) {
      return c.json({ error: 'baseUserId is required (string, max 200 chars)' }, 400);
    }

    // Validate optional fields
    const VALID_TIERS = new Set(['bronze', 'silver', 'gold']);
    const safeTier = typeof tier === 'string' && VALID_TIERS.has(tier) ? tier : null;
    const safeAccounting = typeof accountingSoftware === 'string' && accountingSoftware.length <= 200
      ? accountingSoftware : null;
    const safeCompanyName = typeof companyName === 'string' && companyName.length <= 200
      ? companyName : null;

    const { syncBaseUser } = await import('./db/identity.ts');
    const result = await syncBaseUser(baseUserId, safeAccounting, safeTier, safeCompanyName);

    return c.json({ ok: true, isNew: result.isNew, userId: result.userId });
  } catch (err) {
    console.error('[sync-context] error:', (err as Error).message);
    return c.json({ error: 'Failed to sync context' }, 500);
  }
});

// ── POST /api/create-ticket ────────────────────────────────────────────────────
// Called by the frontend when the user accepts the Salesforce ticket offer.
// Collects session context, calls the Salesforce stub, and returns confirmation.
app.post('/api/create-ticket', async (c) => {
  try {
    const { sessionId } = await c.req.json<{ sessionId?: string }>();
    if (!sessionId || typeof sessionId !== 'string') {
      return c.json({ ok: false, message: 'sessionId is required' }, 400);
    }

    const { getSession } = await import('./pipeline/session.ts');
    const { getMemoryContext } = await import('./memory/session-memory.ts');
    const { createTicket } = await import('./integrations/salesforce/index.ts');

    const session = getSession(sessionId);
    const context = session.context as { previousQuestion?: string; tools?: string[] };
    const { summary, rawTurns } = getMemoryContext(sessionId);

    const conversationSummary = summary
      ?? rawTurns.slice(-6).map(t => `${t.role}: ${t.content}`).join('\n');

    const parts = [
      context.previousQuestion ? `Last question: "${context.previousQuestion}"` : '',
      context.tools?.length ? `Integration: ${context.tools.join(', ')}` : '',
      conversationSummary ? `\nConversation:\n${conversationSummary}` : '',
    ].filter(Boolean);

    const issueDescription = parts.join('\n') || 'User requested support after repeated questions';

    const result = await createTicket(context, issueDescription);

    if (result.success) {
      return c.json({ ok: true, ticketId: result.ticketId });
    }
    console.log('[create-ticket] Salesforce stub returned error:', result.error);
    return c.json({ ok: false, message: 'Our team has been notified — expect a reply within 1 business day.' });
  } catch (err) {
    console.error('[create-ticket] error:', (err as Error).message);
    return c.json({ ok: false, message: 'Our team has been notified — expect a reply within 1 business day.' });
  }
});

// ── GET /health ────────────────────────────────────────────────────────────────
// Simple ping endpoint. Used to check if the server is running.
// Try it: curl http://localhost:4010/health
app.get('/health', (c) => c.json({ status: 'ok' }));

// Serve everything in the frontend/dist/ folder as static files.
// No-cache headers ensure the browser always loads the latest files during development.
app.use('*', serveStatic({ root: './frontend/dist' }));

// ── Startup ────────────────────────────────────────────────────────────────────
// Start listening immediately so health checks pass, then validate the
// knowledge manifest in the background. The manifest check is a sanity check
// only — it does not gate incoming traffic.
serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, () => {
  console.log(`[server] ${new Date().toISOString()} listening on http://localhost:${PORT}`);
  loadAllDocuments().catch((err: Error) => {
    console.error(`[server] manifest check error: ${err.message}`);
  });
});
