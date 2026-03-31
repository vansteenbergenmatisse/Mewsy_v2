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
