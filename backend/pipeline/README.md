# backend/pipeline/

These are the files that run every time a user sends a message. They work together like an assembly line — each file does one specific job, then passes the result to the next.

## How it works step by step

```
User message comes in
    ↓
agent.js — decides which documents to load (or skips if it already knows)
    ↓
claude.js — asks Claude Haiku (cheap, fast): "which documents are relevant?"
    ↓
agent.js — reads those documents from the knowledge/ folder
    ↓
claude.js — asks Claude Sonnet (smarter): "given these documents, answer this question"
    ↓
Answer goes back to the user
```

## Files

### agent.js — The coordinator

Runs the whole process from start to finish. It:

- Reads `knowledge-manifest.json` to know what documents exist
- Decides whether to ask the routing AI again, or reuse the last answer's documents (e.g. if the user just replied "Consumed" to a clarifying question, no need to re-route)
- Loads the chosen `.md` files from disk
- Updates the session with context clues (which tool did they mention? are they getting frustrated? what setup type did they confirm?)
- Falls back to **BASIC_MODE** when no documents match — in this mode Claude asks one clarifying question instead of guessing

### claude.js — The AI layer

The only file that actually talks to Anthropic's Claude. Two separate jobs:

- **`selectRelevantFiles()`** — uses Claude Haiku (cheap and fast) to pick which documents are relevant. Returns a confidence score between 0 and 1. Runs at temperature 0 (deterministic — always picks the same docs for the same question).
- **`chat()`** — uses Claude Sonnet (smarter, more conversational) to write the actual reply. The base system prompt is **prompt cached** — Anthropic charges less for it after the first call because it's static and reused every time.

### session.js — Memory

Remembers the conversation history and user context for each browser tab. Stores:

- `history` — the back-and-forth messages so Claude knows what was already said
- `context` — useful facts gathered during the conversation:
  - Which language the user is using
  - Which integration tools they mentioned (e.g. Xero, Exact Online)
  - Which accounting flow setup they're on (Consumed, Closed, or Hybrid)
  - How many times they've been frustrated
  - Which documents were loaded last turn (for skip-routing)
  - Whether Mewsie just asked a question (so the next short reply knows it's a follow-up)

Sessions expire after 30 minutes of inactivity. Maximum 20 message pairs per session.
