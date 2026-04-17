/**
 * Mewsie central configuration — all tunable constants live here.
 * This is the single file to change when adjusting pipeline behaviour.
 * Never hardcode these values elsewhere — always import from this file.
 */

// ── Routing ────────────────────────────────────────────────────────────────────

// Maximum number of knowledge documents loaded and passed to Sonnet per answer turn.
// Higher = more context but more tokens. Keep between 1–10.
export const ROUTER_MAX_DOCS = 5;

// Whether to use Damerau-Levenshtein fuzzy matching in the keyword pre-filter.
// When true, keywords ≥ 5 chars tolerate 1 edit (6–10 chars) or 2 edits (11+ chars).
// Keywords < 5 chars always use exact matching to prevent false positives on short
// terms like "GL", "POS", "VAT". Set false to revert to pure substring matching.
export const FUZZY_MATCH_ENABLED = true;

// Whether to pass recent conversation history to Stage 2A routing.
// Helps with follow-up questions that reference earlier context.
export const ROUTER_HISTORY_ENABLED = true;

// Number of conversation turn-pairs (user + assistant) to send to Stage 2A.
// More pairs = better follow-up resolution, but more tokens. Range: 1–20.
export const ROUTER_HISTORY_PAIRS = 5;

// Maximum number of docs from Stage 1 keyword matching passed to Stage 2A for verification.
// Stage 1 Gate 2 fires when matched docs ≤ this value AND cluster is coherent.
// If matched docs exceed this value, gates 4/5 fire → CLARIFY instead of Stage 2A.
// Range: 1–10. Default: 5.
export const STAGE2A_SHORTLIST_MAX = 5;

// ── Clarification ──────────────────────────────────────────────────────────────

// Maximum number of times Stage 2B can choose Decision A before being forced to Decision B.
// Once this count is reached, Stage 2B always picks Decision B (admits no docs available).
// Range: 1–10. Default: 2.
export const MAX_CLARIFY_ROUNDS = 2;

// Number of clarifying questions asked per round when the intent is unclear.
// All questions are generated at once and shown as a card carousel — the user
// answers each in sequence with no AI call between cards, then all answers are
// sent together for routing. Range: 1–5. Default: 3.
export const CLARIFY_QUESTIONS_PER_ROUND = 3;

// Maximum number of quick-reply buttons shown to the user per response.
// Range: 2–10.
export const BUTTON_MAX = 7;

// Maximum number of Haiku clarifying questions allowed in Lane A of post-answer mode.
// After this budget is used, the next unanswerable follow-up goes to BASIC.
// Range: 0–3. Default: 1.
export const POST_ANSWER_CLARIFY_BUDGET = 1;

// ── Frustration detection ──────────────────────────────────────────────────────

// Number of frustration signals in a session before Mewsie escalates tone/response.
// Range: 1–10.
export const FRUSTRATION_THRESHOLD = 3;

// ── Session management ─────────────────────────────────────────────────────────

// Maximum number of message pairs (user + assistant) stored per session.
// Older pairs are dropped to keep token usage bounded. Range: 5–100.
export const SESSION_MAX_PAIRS = 20;

// How long a session stays alive with no activity, in minutes.
// After this, the session is cleared. Range: 5–1440 (up to 24h).
export const SESSION_TTL_MINUTES = 30;

// Whether the user's selected language persists after a session timeout.
// true = language preference is remembered across sessions; false = resets on timeout.
export const LANGUAGE_PERSISTS_ON_TIMEOUT = true;

// ── Persistence ───────────────────────────────────────────────────────────────

// Master toggle for all Supabase writes. When false, the TurnBuffer.flush()
// and identity resolution are no-ops. Set to true in production after testing.
export const ENABLE_DB_WRITES = process.env.ENABLE_DB_WRITES === 'true';

// ── Response batching ──────────────────────────────────────────────────────────

// Word count above which a long response is split into batches for streaming.
// Keep positive. Typical value: 300–600.
export const RESPONSE_BATCH_THRESHOLD_WORDS = 400;

// Step count above which a numbered-list response is split into batches.
// Keep positive. Typical value: 5–15.
export const RESPONSE_BATCH_THRESHOLD_STEPS = 8;
