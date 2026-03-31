# Mewsie — Claude Code Instructions

You are building **Mewsie**, a cache-augmented generation (CAG) chatbot that answers FAQ questions from curated markdown documents. Read this file fully before doing anything. Follow it every session.

## The Mewsie Architecture

**Layer 1: Docs (The Knowledge)**

- Markdown files stored in `knowledge/`
- Each file covers one topic and contains everything Mewsie is allowed to answer about that topic
- Written in plain language — if it's not in the doc, Mewsie won't answer it

**Layer 2: Pipeline (The Logic)**

- Three steps run in sequence on every user message: Router → Loader → Answer
- The Router classifies the question and selects the right doc(s)
- The Loader reads those docs from disk and builds the context block
- The Answer step responds using only what the Loader provided
- No step skips ahead, loops back, or makes decisions outside its role

**Layer 3: Scraper (The Updater)**

- A cron job that runs separately from the pipeline on a 24h schedule
- Fetches external pages and rewrites the relevant files in `docs/`
- Keeps the knowledge base current without manual intervention
- Fails safely — if a scrape returns bad data, the existing file is preserved

**Why this matters:** Mewsie's quality is entirely determined by what's in `docs/`. The pipeline is just plumbing. If the docs are clean, current, and well-structured, Mewsie answers well. If they're not, no amount of prompt engineering fixes it. Keep the docs as the priority.

## File Structure

```
Mewsie/
├── knowledge/           # Markdown knowledge base — one file per topic, source of truth for all answers
├── backend/        # Node.js pipeline — router, loader, and answer logic
├── scraper/        # Cron job that fetches external pages and updates docs/
├── frontend/       # Vanilla JS/HTML/CSS chat interface
├── CLAUDE.md       # This file
└── .env
```

## The Self-Improvement Loop

```
Every failure is a chance to make the system stronger:

1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
5. Move on with a more robust system
```

## File Structure and naming

- All file and folder names are lowercase with hyphens between words, no spaces, no underscores, no numbers
- Names describe exactly what the file does or contains, a 5 year old should understand it
- Markdown files in `knowledge/` are named after their topic, `pricing.md`, `getting-started.md`, not `doc1.md` or `faq-v2.md`
- No version numbers, timestamps, or suffixes in filenames, if a file changes, its content changes, not its name
- One clear purpose per file — if a name needs "and" in it, split it into two files

## Knowledge organisation rules — MUST follow every time

When adding pages to the knowledge base (manually or via scraper), always apply these rules without exception:

**One topic = one file, always split**
- Never put multiple distinct topics, integrations, or sections into a single `.md` file
- If a page covers N integrations/features/topics, create N files — one per topic
- Example: a Mews features page covering Datev, Xero, NetSuite → `mews-features/mews-to-datev.md`, `mews-features/mews-to-xero.md`, etc. NOT one combined `mews-features.md`

**Always use a folder**
- Scraped or manually added files always live inside a named folder under `knowledge/website/<group>/`
- Never drop a `.md` file directly into `knowledge/website/` at the top level
- The folder groups related files together (e.g. `mews-features/`, `omniboost-help-center/`)

**Every file must be in knowledge-manifest.json**
- After writing any `.md` file, immediately add or update its entry in `knowledge/knowledge-manifest.json`
- Required fields: `title`, `description` (one sentence, ≤30 words), `keywords` (8–12 terms), `path`
- Scraper-managed files also need: `source_url`, `source_type`, `source_parent_id`
- Never leave a `.md` file without a manifest entry — the router cannot find it otherwise

**Scraper types to use**
- `static` — one URL, renders to one file (use for truly standalone pages)
- `static-split` — one URL, splits by `##` headings into multiple files (use for pages with multiple distinct sections like feature comparison tabs)
- `multi` — index page that links to many article pages, each scraped separately
- `confluence` — Confluence REST API, folder-based

## Testing

Test suite lives in `tests/`. Run with `tsx tests/run-all.ts` or `npm test`.
Runs automatically on `npm run dev` (predev hook) — failures block the dev server.

**Non-negotiable architecture rules:**
- No mocking. No external test frameworks (Jest, Vitest, Mocha — never).
- Custom Reporter pattern: `{ pass(label), fail(label, err), skip(label, reason), results: {ok: boolean|'skip'}[] }`
- Every suite exports exactly one function: `export async function check<Scope>(reporter: Reporter)`
- Suite files: `tests/suites/check-*.ts`
- Canonical order: env → manifest → scraper → routing → pipeline → session → server → chat → frontend
- Real API calls. Real server. No mocks.
- Toggle individual suites on/off via the `SUITES` config object at the top of `tests/run-all.ts`.

**Per-task rules — every task, no exceptions:**
- New feature → add tests in the same task → run suite → update `tests/README.md` → mark done
- Changed feature → update tests in the same task
- Deleted feature → remove test cases in the same task
- New required env variable → update `check-env.ts` in the same task
- Suite added, removed, or changed → update `tests/README.md` in the same task
- A task is **not done** until `npx tsx tests/run-all.ts` exits 0

**Trigger map — which test file to update for each change:**
| Change | Update |
|--------|--------|
| Route in `backend/server.ts` | `check-server.ts` |
| Input validation in `backend/server.ts` | `check-server.ts` |
| `backend/pipeline/agent.ts` | `check-pipeline.ts`, `check-routing.ts` |
| `backend/pipeline/claude.ts` | `check-pipeline.ts`, `check-chat.ts` |
| `backend/pipeline/session.ts` | `check-session.ts` |
| `backend/fetch/loader.ts` | `check-pipeline.ts` |
| `backend/errors/` | `check-server.ts`, `check-pipeline.ts` |
| `backend/config.ts` or `backend/config/mewsie.config.ts` | `check-env.ts`, `check-pipeline.ts` |
| New required env var | `check-env.ts` |
| `backend/scraper/scrapers/` or `backend/scraper/utils/` or `backend/scraper/pipeline/` | `check-scraper.ts` |
| `knowledge/knowledge-manifest.json` | `check-manifest.ts`, `check-routing.ts` |
| `frontend/src/components/` or `frontend/src/utils/` or `frontend/src/config/` | `check-frontend.ts` |
| `prompts/system.ts` | `check-chat.ts` (review existing assertions) |

See `tests/README.md` for the full suite table and maintenance rules.
