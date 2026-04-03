/**
 * Mewsie central configuration — all tunable constants live here.
 * This is the single file to change when adjusting pipeline behaviour.
 * Never hardcode these values elsewhere — always import from this file.
 */

// ── Routing ────────────────────────────────────────────────────────────────────

// Maximum number of knowledge documents passed to Sonnet per answer turn.
// Higher = more context but more tokens. Keep between 1–10.
export const ROUTER_MAX_DOCS = 5;

// Confidence threshold for answering directly when multiple docs are selected.
// At or above this value, all selected docs are loaded and Sonnet answers immediately.
// Below this value with multiple docs → CLARIFY mode (Sonnet asks the user to narrow down).
// Range: 0.0–1.0. Recommended: 0.90–0.98.
export const ROUTER_SINGLE_DOC_CONFIDENCE = 0.95;

// Confidence threshold for answering directly when exactly ONE doc is selected.
// At or above this value with a single doc → ANSWER mode.
// Below this value → CLARIFY mode (Sonnet asks a targeted clarifying question).
// Range: 0.0–1.0. Must be lower than ROUTER_SINGLE_DOC_CONFIDENCE. Recommended: 0.80–0.90.
export const ROUTER_CONFIDENCE_THRESHOLD = 0.85;

// Whether to pass recent conversation history to the router.
// Helps with follow-up questions that reference earlier context.
export const ROUTER_HISTORY_ENABLED = true;

// Number of conversation turn-pairs (user + assistant) to send to the router.
// More pairs = better follow-up resolution, but more tokens. Range: 1–20.
export const ROUTER_HISTORY_PAIRS = 5;

// ── Clarification ──────────────────────────────────────────────────────────────

// Maximum number of consecutive clarifying question rounds before Mewsie stops asking.
// After this many rounds, Sonnet will attempt an answer with available context.
// Range: 1–10.
export const MAX_CLARIFY_ROUNDS = 3;

// Maximum number of quick-reply buttons shown to the user per response.
// Range: 2–10.
export const BUTTON_MAX = 7;

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

// ── Response batching ──────────────────────────────────────────────────────────

// Word count above which a long response is split into batches for streaming.
// Keep positive. Typical value: 300–600.
export const RESPONSE_BATCH_THRESHOLD_WORDS = 400;

// Step count above which a numbered-list response is split into batches.
// Keep positive. Typical value: 5–15.
export const RESPONSE_BATCH_THRESHOLD_STEPS = 8;
