# CLAUDE.md — Mewsie

## Project in 30 seconds

Mewsie is a Cache-Augmented Generation (CAG) support chatbot for the Mews × Omniboost hotel accounting integration. It answers **only** from curated markdown in `knowledge/` — no hallucinations, no outside knowledge. Stack: Hono backend (Node/TS), React/Vite frontend, Anthropic SDK (Sonnet 4.6 for answers, Haiku 4.5 for routing). For full architecture detail, read `docs/architecture.md`.

## The Mewsie Architecture

**Layer 1: Knowledge (The Source of Truth)**

- Markdown in `knowledge/website/<group>/<topic>.md`, indexed by `knowledge-manifest.json`
- One file per topic — everything Mewsie can say about it
- `knowledge/help-resources/` is frontend-only, not indexed
- If it's not in the knowledge base, Mewsie won't answer it

**Layer 2: Pipeline (The Brain)**

- `backend/pipeline/agent.ts` routes each message: scores, gates, verifies with Haiku, dispatches to ANSWER/CLARIFY/BASIC
- `backend/pipeline/claude.ts` — every Anthropic call. Sonnet answers, Haiku routes and generates buttons
- `backend/pipeline/session.ts` — in-memory session state, clears on restart

**Layer 3: Persistence (The Memory)**

- `backend/db/` holds anything that must survive a restart
- `client.ts` — single DB connection/pool, exported once
- `schema.ts` — table definitions and typed row shapes
- `migrations/NNNN_<description>.sql` — versioned; never edit an applied one, add a new one
- `repositories/<entity>.ts` — one file per table. Read/write only, no business logic
- **All SQL lives inside repositories.** Never inline queries in routes or services
- **Layering:** routes → services → repositories → client. Routes never import `db/` directly
- Transactions live in services, passing a shared client across multiple repository calls

**Layer 4: Interface (The Surface)**

- `backend/server.ts` sets up Hono; `backend/routes/<endpoint>.ts` — handlers; `backend/services/<domain>.ts` — business logic
- `frontend/src/` is a React SPA, all widget state in `App.tsx`
- Frontend has no business logic, credentials, or Anthropic calls — build a backend service instead

**Layer 5: Scraper (The Updater)**

- Cron job under `backend/scraper/`, runs outside the pipeline
- Ingests `knowledge/fetch_sources.json`, writes to `knowledge/website/`
- Source types (`static`, `static-split`, `multi`, `confluence`) in `scrapers/`; new types go there

**Why this matters:** Mewsie's quality is determined by `knowledge/`. The pipeline is plumbing. Clean, current docs make Mewsie answer well; prompt engineering can't rescue bad docs.

## File Structure

```
Mewsie/
├── knowledge/              # Markdown KB — source of truth
│   ├── website/<group>/    # Indexed content, one topic per file
│   ├── help-resources/     # Frontend-only, NOT indexed
│   ├── knowledge-manifest.json
│   └── fetch_sources.json
├── backend/
│   ├── server.ts           # Hono setup + route registration
│   ├── config/             # Env + tunable constants
│   ├── pipeline/           # Routing, AI calls, sessions
│   ├── db/                 # Persistence (client, schema, migrations, repositories)
│   ├── routes/             # HTTP handlers
│   ├── services/           # Business logic
│   ├── scraper/            # Cron refresher for knowledge/
│   └── types/              # Shared TypeScript types
├── frontend/               # React SPA, thin chat widget
├── prompts/system.ts       # Sonnet system prompt
├── tests/                  # Custom runner + 10 suites
├── docs/architecture.md
├── CLAUDE.md
└── .env
```

## Naming and knowledge rules — MUST follow

- All file/folder names are lowercase-with-hyphens. No spaces, underscores, numbers, versions, or timestamps
- Filenames describe what the file contains (`pricing.md`, not `doc1.md`). One purpose per file — if the name needs "and", split it
- One topic = one file. A page covering N integrations becomes N files, never combined
- Every `.md` sits inside a named folder under `knowledge/website/<group>/` — never at the top level
- Every `.md` has a matching `knowledge-manifest.json` entry: `title`, `description` (≤30 words), `keywords` (8–12), `path`; scraped files also carry `source_url`, `source_type`, `source_parent_id`
- Missing manifest entry = router can't find it

## Testing

Run with `npm test` (or `tsx tests/run-all.ts`). Predev hook on `npm run dev` blocks the dev server on failure.

- No mocks. No Jest/Vitest/Mocha. Real API calls, real server
- Suites at `tests/suites/check-*.ts`, each exports one `check<Scope>(reporter)` function
- **Every task, no exceptions:** new feature → add tests; changed feature → update tests; deleted feature → remove tests; new env var → update `check-env.ts`
- If a user describes expected behavior during planning, it becomes a test case
- A task is **not done** until `npm test` exits 0

## Stability
- **Stable — change deliberately:** 3-block Sonnet prompt structure, answer-signal grammar, tier marker syntax, Sonnet/Haiku split, manifest schema, pipeline flow.
- **Evolving — change freely:** values in `mewsie.config.ts`, docs under `knowledge/website/`, UI copy, CSS, test coverage.

## Ask vs proceed
- **Ask first:** touching `prompts/system.ts`, adding dependencies, altering signal grammar or tier syntax, writing migrations, changes that could orphan knowledge docs.
- **Proceed:** failing-test fixes, knowledge docs via the documented process, single-file refactors, new `mewsie.config.ts` constants.

## Pipeline guard invariants — partial-guard pattern is a recurring bug

The pipeline has a known failure mode: a config constant or counter is defined but only wired to a **subset** of the code paths that should respect it, making the guard silently broken. Before adding any counter, flag, or threshold to `mewsie.config.ts` or `session.ts`:

1. **Every CLARIFY reply** (Stage 1 gates and Stage 2B recovery alike) must increment `clarifyRoundCounter`. The counter is checked against `MAX_CLARIFY_ROUNDS` before the next CLARIFY is sent. If you add a new CLARIFY trigger in `agent.ts`, make sure the counter increment is in the shared CLARIFY path — not gated on a specific reason.
2. **`postAnswerClarifyUsed`** must be reset to `false` after every successful ANSWER (both in the main pipeline and the post-answer Lane A path). If you add a new path that clears post-answer state, include this field.
3. **Never add a config constant that is never read.** If you're not ready to wire it up, don't add it. Dead constants (`FRUSTRATION_THRESHOLD` was unused for several sessions) cause future sessions to assume they're active. Wire it immediately or delete it.

## Self-improvement loop

When something breaks:

1. Identify what broke
2. Fix the code — don't work around it
3. Verify with the relevant suite
4. Update this file if the fix reveals a new coupling, convention, or placement rule
5. Update `docs/architecture.md` if the code structure changed

Recurring confusion across sessions means this file is missing something — fix the file.