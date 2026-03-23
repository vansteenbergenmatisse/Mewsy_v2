# backend/scraper/utils/

Small helper functions used by the rest of the scraper. Each file does one tiny thing really well.

## Files

### hash.js — Content fingerprinting

Creates a SHA-256 fingerprint (hash) of any text content. This is how the scraper detects whether a page has changed since the last sync — if the new hash matches the stored hash, the page is skipped. If it's different, it gets re-scraped and re-cleaned.

Uses Node's built-in `crypto` module — no extra packages needed.

### slugify.js — Safe file names

Converts page titles into safe, readable folder and file names. Examples:
- `"Getting Started with Mews"` → `"getting-started-with-mews"`
- `"1320910850 — Information"` → `"information"` (strips numeric-only segments)
- `"Onboarding & Setup Guide!"` → `"onboarding-setup-guide"`

Rules:
- Lowercase only
- Hyphens between words, no spaces or underscores
- Special characters stripped
- Never returns a purely numeric result (Confluence IDs get stripped out)
- Maximum 80 characters

### logger.js — Sync log

Writes timestamped log entries to both the console and `knowledge/sync.log`. Every meaningful event during a sync run gets logged here so you can see exactly what happened.

Log levels:
- `[INFO]` — normal progress (scraped a file, skipped an unchanged file, deleted an old file)
- `[WARN]` — something went slightly wrong but the sync continued (cleanup failed, saved raw content instead)
- `[ERROR]` — a source was skipped entirely (Firecrawl was down, Confluence returned an error)
