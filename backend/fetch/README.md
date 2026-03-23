# backend/fetch/

This folder checks that Mewsy's knowledge files are all in order when the server starts. Think of it like a librarian who counts all the books before opening the library for the day.

## Files

### loader.js

Runs once automatically when the server boots up. It opens `knowledge/knowledge-manifest.json` and counts how many documents are registered. If the manifest file is missing or broken, it logs a warning right away — much better than finding out in the middle of a user conversation.

This file **does not** load all the documents into memory. Documents are only loaded when a user actually asks a question that needs them. That way Mewsy is fast and doesn't waste memory.

## What it does NOT do

This folder is just for startup checks. The actual scraping and automatic document updating happens in `backend/scraper/` — that's where Confluence, web pages, and help center articles get fetched and saved.
