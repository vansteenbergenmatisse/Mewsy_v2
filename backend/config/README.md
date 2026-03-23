# backend/config/

This folder has one job: store every tunable number or setting for Mewsy in one place. If you want to change how Mewsy behaves — like how many documents it loads at once, or when it asks a clarifying question — you change it here, not buried inside the logic files.

## Files

### mewsy.config.js

The single source of truth for all settings. Every other file in the backend imports its constants from here.

| Constant | What it does |
|---|---|
| `ROUTER_MAX_DOCS` | Maximum number of documents the routing agent can pick (5) |
| `ROUTER_SINGLE_DOC_CONFIDENCE` | If the router is this confident one doc is enough, it stops looking (0.95 = 95%) |
| `ROUTER_CONFIDENCE_THRESHOLD` | If confidence drops below this, Mewsy asks a clarifying question instead of guessing (0.90 = 90%) |
| `ROUTER_HISTORY_ENABLED` | Whether to send recent conversation history to the router so it has more context |
| `ROUTER_HISTORY_PAIRS` | How many back-and-forth messages to include in that history |
| `MAX_CLARIFY_ROUNDS` | After this many clarifying questions with no resolution, Mewsy just gives its best answer (3) |
| `BUTTON_MAX` | Maximum number of option buttons to show at once (7) |
| `FRUSTRATION_THRESHOLD` | After this many frustrated messages, Mewsy offers to create a support ticket (3) |
| `SESSION_MAX_PAIRS` | How many messages to remember per conversation (20 back-and-forths) |
| `SESSION_TTL_MINUTES` | How long before an idle conversation is forgotten (30 minutes) |
| `LANGUAGE_PERSISTS_ON_TIMEOUT` | Whether to remember the user's language even after their session expires |
| `RESPONSE_BATCH_THRESHOLD_WORDS` | If a response is longer than this, split it into chunks (~400 words) |
| `RESPONSE_BATCH_THRESHOLD_STEPS` | If a process has more than this many steps, split it into chunks (~8 steps) |
