# backend/scraper/scrapers/

Each file in here knows how to fetch content from one specific type of source. They all do the same job — get text from somewhere — but in different ways depending on where it comes from.

## Files

### static.js — Single web page

Fetches one URL and saves it as one markdown file. Uses Firecrawl (a web scraping service) to handle all the JavaScript rendering and HTML conversion automatically.

- Input: `{ id, label, url, type: "single" }`
- Output: `knowledge/website/<id>.md`

### multi.js — Help center collection

For pages that are actually an index of many articles (like a help center category page). It:

1. Fetches the index page
2. Extracts all the links on it
3. Sends the link list to Claude and asks: "which of these are actual articles, not navigation or footer links?"
4. Fetches each article individually

- Input: `{ id, label, url, type: "multi" }`
- Output: `knowledge/website/<id>/` — one file per article

### confluence.js — Atlassian Confluence

Walks through a Confluence folder and fetches every page inside it, including subfolders. Confluence stores content in a special XML format called "Storage Format" — this file converts it to clean markdown.

- Input: `{ id, label }` — `id` is the Confluence page/folder ID from the URL
- Output: `knowledge/confluence/<label>/` — mirrors the Confluence folder structure exactly
- Skips: attachments, PDFs, images — only plain page text is saved
