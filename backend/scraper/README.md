# backend/scraper/

This folder automatically keeps Mewsie's knowledge documents up to date. Instead of manually copying and pasting content from websites and Confluence, this scraper fetches it automatically on a schedule, cleans it up using AI, and saves it as markdown files that Mewsie can read.

Think of it as a robot librarian that goes out, grabs the latest information, and files it in the right place — every hour or every day, depending on the source.

## How to run it

```bash
# Force a full resync right now (runs once and stops)
npm run sync

# Start the automatic scheduler (runs forever, checks on the configured schedule)
node backend/scraper/index.js
```

## Folder structure

```
backend/scraper/
├── index.js          Entry point — starts the schedule or runs a one-time sync
├── config.js         Settings: which AI model to use, file paths, delays
├── scrapers/         How to fetch content from different source types
│   ├── static.js     Fetches a single web page
│   ├── multi.js      Fetches an index page and all the articles it links to
│   └── confluence.js Fetches pages from Atlassian Confluence
├── pipeline/         What happens to content after it's fetched
│   ├── cleanup.js    Uses AI to remove menus/footers and format as clean markdown
│   └── manifest.js   Updates the knowledge-manifest.json file to track all documents
├── prompts/
│   └── cleanup.txt   The instructions given to the AI for how to clean content
└── utils/
    ├── hash.js        Creates a fingerprint of content to detect if it changed
    ├── slugify.js     Turns page titles into safe folder/file names (e.g. "Getting Started" → "getting-started")
    └── logger.js      Writes a log of everything the scraper did to knowledge/sync.log
```

## How a sync run works

1. Reads `knowledge/fetch_sources.json` to see what needs to be scraped
2. Fetches the content (from a website via Firecrawl, or from Confluence via REST API)
3. Creates a fingerprint (hash) of the content and compares it to the saved hash — if nothing changed, skip it
4. If it changed: runs the AI cleanup agent to strip menus, banners, and other noise
5. Saves the cleaned content as a `.md` file in `knowledge/`
6. Updates `knowledge/knowledge-manifest.json` with the new description, path, and fingerprint
7. Deletes any files whose source was removed from `fetch_sources.json`

## How to add a new source

Open `knowledge/fetch_sources.json` and add an entry. Three types are supported:

**Single webpage** (one URL → one file):
```json
{ "id": "my-page", "label": "My Page", "type": "single", "url": "https://example.com/page" }
```

**Multi-article page** (one index page → many files, one per article):
```json
{ "id": "my-section", "label": "My Section", "type": "multi", "url": "https://example.com/help" }
```

**Confluence folder** (walks the full folder tree recursively):
```json
{ "id": "123456789", "label": "Folder Name" }
```

## Environment variables required

| Variable | What it's for |
|---|---|
| `ANTHROPIC_API_KEY` | For the AI cleanup and description generation |
| `FIRECRAWL_API_KEY` | For scraping websites |
| `CONFLUENCE_BASE_URL` | e.g. `https://yourcompany.atlassian.net` |
| `CONFLUENCE_EMAIL` | Your Atlassian login email |
| `CONFLUENCE_TOKEN` | Your Atlassian API token |

## The sync log

Every action is recorded in `knowledge/sync.log`:
```
[2026-03-19T10:00:00.000Z] [INFO] Scraped: knowledge/website/mews-integration-tiers.md
[2026-03-19T10:00:01.000Z] [WARN] Cleanup failed — saved raw content
[2026-03-19T10:00:02.000Z] [INFO] Unchanged: knowledge/confluence/page.md — skipping
[2026-03-19T10:00:03.000Z] [ERROR] Firecrawl failed — skipping this run
```
