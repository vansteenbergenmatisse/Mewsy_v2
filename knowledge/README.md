# knowledge/

This folder is the brain of Mewsy. Everything Mewsy knows comes from the markdown files stored here. If something isn't in these files, Mewsy won't answer it — and that's intentional.

## The golden rule

**Quality of answers = quality of documents.** The AI pipeline is just plumbing. If the documents are clear, current, and well-structured, Mewsy answers well. If the documents are messy or outdated, no amount of AI tuning fixes it.

## Files and folders

```
knowledge/
├── knowledge-manifest.json    The index of every document Mewsy knows about
├── fetch_sources.json         What the scraper should fetch and how often
├── sync.log                   A log of every scraper run (created automatically)
├── mews.md                    ← Manually maintained — do not delete or rename
├── omniboost.md               ← Manually maintained — do not delete or rename
├── website/                   Pages fetched from public websites (auto-managed by scraper)
└── confluence/                Pages fetched from Confluence (auto-managed by scraper)
```

## knowledge-manifest.json

The routing agent reads this file to know what documents exist. It never loads all the documents — it reads this manifest first, picks the most relevant ones, then loads just those.

Each entry has:
- `title` — a short description of what the document covers (5-8 words)
- `description` — 2-3 sentences explaining what topics are in the document (this is what the routing AI reads to decide relevance)
- `path` — where the file lives on disk
- `last_updated` — when it was last changed

Scraper-managed entries also have `source_type`, `source_url`, and `content_hash`.

**Important:** entries without a `source_type` field (`mews` and `omniboost`) are manually maintained. The scraper will never touch, overwrite, or delete them.

## fetch_sources.json

Tells the scraper where to get content from. Edit this file to add or remove sources. The scraper re-reads it on every sync run — no restart needed.

Three source types: `single` (one URL → one file), `multi` (index page → many files), and Confluence folders (defined by their numeric ID).

## mews.md and omniboost.md

Hand-written documents covering the core OmniBoost × Mews integration. These are the most important documents in the knowledge base — they cover accounting flows, GL mapping, integration tiers, and all the core concepts. Edit them directly when information needs to change.

## Adding a new manual document

1. Create a new `.md` file in `knowledge/` with a clear, descriptive name (e.g. `pricing.md`)
2. Add an entry to `knowledge-manifest.json` with a title and description
3. Restart the server (or wait for it to reload)

The router will immediately start considering this document for relevant questions.
