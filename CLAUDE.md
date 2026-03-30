# Mewsy — Claude Code Instructions

You are building **Mewsy**, a cache-augmented generation (CAG) chatbot that answers FAQ questions from curated markdown documents. Read this file fully before doing anything. Follow it every session.

## The Mewsy Architecture

**Layer 1: Docs (The Knowledge)**

- Markdown files stored in `knowledge/`
- Each file covers one topic and contains everything Mewsy is allowed to answer about that topic
- Written in plain language — if it's not in the doc, Mewsy won't answer it

**Layer 2: Pipeline (The Logic)**

- Three steps run in sequence on every user message: Router → Loader → Answer
- The Router classifies the question and selects the right doc(s)
- The Loader reads those docs from disk and builds the context block
- The Answer step responds using only what the Loader provided
- No step skips ahead, loops back, or makes decisions outside its role

**Layer 3: Scraper (The Updater)**

- A cron job that runs separately from the pipeline on a 24h schedule
- Fetches external pages and rewrites the relevant files in `knowledge/`
- Keeps the knowledge base current without manual intervention
- Fails safely — if a scrape returns bad data, the existing file is preserved

**Why this matters:** Mewsy's quality is entirely determined by what's in `knowledge/`. The pipeline is just plumbing. If the docs are clean, current, and well-structured, Mewsy answers well. If they're not, no amount of prompt engineering fixes it. Keep the docs as the priority.

## File Structure

```
mewsy/
├── knowledge/           # Markdown knowledge base — one file per topic, source of truth for all answers
├── backend/        # Node.js pipeline — router, loader, and answer logic
├── scraper/        # Cron job that fetches external pages and updates docs/
├── frontend/       # React + TypeScript chat interface (Vite, .tsx components)
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
