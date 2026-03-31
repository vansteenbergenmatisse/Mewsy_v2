// Mewsie central configuration — all tunable constants live here.
// Import this file instead of hardcoding values in pipeline files.

export const ROUTER_MAX_DOCS = 5;
export const ROUTER_SINGLE_DOC_CONFIDENCE = 0.95;
export const ROUTER_CONFIDENCE_THRESHOLD = 0.80;
export const ROUTER_HISTORY_ENABLED = true;
export const ROUTER_HISTORY_PAIRS = 5;

export const MAX_CLARIFY_ROUNDS = 3;

export const BUTTON_MAX = 7;

export const FRUSTRATION_THRESHOLD = 3;

export const SESSION_MAX_PAIRS = 20;
export const SESSION_TTL_MINUTES = 30;
export const LANGUAGE_PERSISTS_ON_TIMEOUT = true;

export const RESPONSE_BATCH_THRESHOLD_WORDS = 400;
export const RESPONSE_BATCH_THRESHOLD_STEPS = 8;
