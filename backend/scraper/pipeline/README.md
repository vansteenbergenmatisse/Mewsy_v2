# backend/scraper/pipeline/

After content is fetched by one of the scrapers, it passes through this pipeline to get cleaned up and registered in the manifest.

## Files

### cleanup.js — AI content cleaner

Takes raw scraped text (which includes menus, footers, cookie banners, and other junk) and uses Claude to:

1. **Strip the noise** — removes navigation, footers, sidebars, cookie banners, login prompts, and anything else that isn't the actual article content
2. **Format cleanly** — converts everything to proper markdown headings, lists, tables, and code blocks
3. **Never changes the real content** — word-for-word preservation of titles, steps, instructions, and body text is critical. If Mewsie tells a user the wrong steps because the AI paraphrased something, that's a bug.

After cleaning, it makes a second AI call to write a 2-3 sentence description of the document. This description goes into `knowledge-manifest.json` and is what the routing agent reads to decide whether to load this document.

If the AI call fails, the raw content is saved with a warning comment at the top (`<!-- CLEANUP FAILED: raw content -->`) rather than being discarded. Nothing is ever lost.

### manifest.js — Knowledge manifest manager

Reads and writes `knowledge/knowledge-manifest.json`. This file is the index of everything Mewsie knows about.

**Rules it enforces:**
- Entries without a `source_type` field (like `mews.md` and `omniboost.md`) are manually maintained and are **never touched, overwritten, or deleted** by the scraper
- When a file changes: updates the hash, description, path, and timestamp
- When a file is deleted: removes its entry from the manifest completely
- When a file is new: adds a full entry with all fields
