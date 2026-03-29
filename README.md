# Mewsy v2

Mewsy is a support chatbot for Omniboost — a company that connects hotel software (Mews) with accounting tools (Xero, Exact Online, etc.). Hotel staff ask Mewsy questions about the integration. It answers only from curated knowledge files. If the answer isn't there, it says so.

---

## Features

### 1. CAG Pipeline (Router → Loader → Answer)
Every message runs through exactly three steps in sequence:
- **Router** — asks a fast Claude model which knowledge file(s) are relevant (returns doc IDs + confidence score)
- **Loader** — reads those files from disk and builds a context block
- **Answer** — passes the context + question to a capable Claude model and returns the reply
- No step skips, loops back, or makes decisions outside its role

### 2. Document routing with confidence scoring
- The router selects up to 5 documents from the knowledge manifest
- Each selection returns a confidence score (0–1)
- If confidence ≥ 0.80 → normal answer mode
- If confidence < 0.80 → CLARIFY_MODE (Mewsy asks a targeted clarifying question)
- If no documents match → BASIC_MODE (Mewsy acknowledges it can't help and asks for context)
- The router passes the last 5 message pairs as history so it can understand follow-up questions

### 3. Skip routing for short follow-ups and greetings
- Greetings and acknowledgements ("hi", "thanks", "ok", "bye", etc.) skip the routing step entirely
- The last loaded documents are reused so Mewsy stays on topic without an extra API call

### 4. Session management (in-memory)
- Each browser tab gets a unique session ID
- History and context are stored in a server-side Map (nothing written to disk)
- Sessions expire after 30 minutes of inactivity
- Only the last 20 message pairs are kept per session (older ones are trimmed)
- A cleanup timer runs every 5 minutes to delete expired sessions
- Sessions are lost if the server restarts

### 5. Multi-language support (6 languages)
- Supported: English, German, Swiss German, Austrian German, French, Dutch
- The user picks a language from the flag dropdown in the widget header
- On the first message (or after a language switch), a system note is prepended to the user message so Claude responds in the correct language for the rest of the conversation

### 6. Frustration detection
- The pipeline tracks how many times in a row the user has asked without getting a satisfying answer
- After 3 consecutive frustrated messages, Mewsy shifts tone and offers to escalate to human support

### 7. Clarification limiting
- CLARIFY_MODE is capped at 3 rounds per topic (MAX_CLARIFY_ROUNDS)
- After 3 clarify rounds without resolution, Mewsy exits clarification and gives its best answer

### 8. Prompt caching
- The base system prompt is cached server-side by Anthropic for 5 minutes
- Reduces latency and API cost on repeated calls within the same cache window

### 9. Rate limiting
- 60 requests per minute per IP address on the chat endpoint
- Returns a 429 with a user-friendly message if exceeded

### 10. CORS
- Requests from localhost (any port) are always allowed — for local development
- Requests from the production domain are allowed via the `ALLOWED_ORIGIN` environment variable
- All other origins are rejected

### 11. Input validation
- `chatInput` is required and must be a string
- `sessionId` is required and must be a string
- Messages longer than 4000 characters are rejected with a 400
- All validation errors return a structured JSON error

### 12. Request timeout
- If the Anthropic API takes longer than 30 seconds, the request is cancelled and a timeout message is returned to the browser
- Prevents the browser from hanging indefinitely

### 13. Knowledge scraper
- A cron job that runs every 24 hours (or on demand via `npm run sync`)
- Scrapes three source types: `static` (single URL), `multi` (index page → many articles), `confluence` (Confluence space folders)
- Uses Firecrawl for web scraping and the Confluence REST API for internal docs
- Uses SHA-256 hashes to detect unchanged pages and skip unnecessary rewrites
- Writes clean markdown files to `knowledge/` and updates `knowledge-manifest.json`
- Fails safely — if a scrape returns bad data, the existing file is kept

### 14. Knowledge manifest
- `knowledge/knowledge-manifest.json` is an index of every available knowledge file
- Each entry has: title, description, keywords, path, source type
- The router reads this manifest on every request to know what documents exist
- The scraper updates this manifest when files are added or changed

### 15. Frontend chat widget (React + Vite + TypeScript)
- Served as a static build from `frontend/dist/`
- Three display states: **hidden** (bubble only), **quarter** (side panel), **full** (full screen)
- Opens in quarter mode on desktop, full mode on mobile

### 16. Progressive message reveal
- Bot responses are split into multiple bubbles (by paragraph or step)
- Bubbles appear one by one with a short delay and typing dots between them
- Makes long answers easier to read

### 17. Option buttons
- When Mewsy's reply contains a list of short choices, the frontend converts it to clickable buttons
- Clicking a button sends that option as the next message
- Buttons are disabled after the user responds
- Maximum 7 buttons per response (BUTTON_MAX)

### 18. Response accordion
- Numbered lists with 8+ steps are automatically grouped into collapsible accordion sections
- The first section is open by default; others are collapsed
- Smooth open/close animation driven by max-height

### 19. Help panel
- A "Help & Resources" button in the widget header opens a slide-over panel
- Lists 6 help topics: Integration overview, Onboarding, Mapping, Revenue push, Troubleshooting, Contact support
- Topics are searchable by keyword
- Each topic has a detail view with structured content

### 20. Language selector
- Flag emoji dropdown in the widget header
- Supports EN, DE, DE-CH, DE-AT, FR, NL
- Selected language is persisted in sessionStorage and restored on page reload

### 21. Unread badge
- When the widget is hidden and Mewsy sends a message, an unread counter appears on the bubble
- The browser tab title also updates with the unread count
- Both reset when the widget is opened

### 22. Thinking indicator
- A rotating set of language-appropriate messages ("Looking that up…", "Checking the docs…", etc.)
- Updates every 5 seconds while the API is in flight

### 23. Sidebar (full mode only)
- A collapsible left panel, shown only in full-screen mode
- Toggled by the hamburger button in the header (hidden in quarter mode)

---

## Folder structure

```
Mewsy_v2/
├── backend/            Server — Hono + Node.js + TypeScript
│   ├── pipeline/       Router, loader, answer, session management
│   ├── scraper/        Knowledge scraper (Firecrawl + Confluence)
│   ├── errors/         Error handler and alerting stubs
│   ├── fetch/          Manifest loader
│   ├── config/         Tunable constants (mewsy.config.ts)
│   └── server.ts       HTTP server entry point
├── frontend/           Chat widget — React + Vite + TypeScript
│   └── src/
│       ├── components/ All React UI components
│       ├── config/     UI strings, languages, help content
│       └── utils/      Text formatting, session ID, chat utilities
├── knowledge/          Markdown knowledge base — source of truth for all answers
├── prompts/            System prompt sent to Claude on every request
├── tests/              Pre-launch test suite (tsx tests/run-all.ts)
└── .env                Secret keys — never commit this file
```

## Running locally

```bash
# Install
npm install

# Run tests, then start server with hot reload
npm run dev

# Frontend dev server (separate terminal — proxies /webhook to backend)
cd frontend && npm run dev
# Opens at http://localhost:5173

# Run tests only
npm test

# Force-run the knowledge scraper
npm run sync
```

## Environment variables

| Variable | Required | What it's for |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `PORT` | No | Server port (default: 3005) |
| `ALLOWED_ORIGIN` | No | Production domain for CORS |
| `CONFLUENCE_EMAIL` | Scraper | Email for Confluence login |
| `CONFLUENCE_TOKEN` | Scraper | API token for Confluence |
| `CONFLUENCE_BASE_URL` | Scraper | Confluence workspace URL |
| `FIRECRAWL_API_KEY` | Scraper | Firecrawl web scraping key |
