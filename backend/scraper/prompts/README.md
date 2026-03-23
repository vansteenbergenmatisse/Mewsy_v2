# backend/scraper/prompts/

This folder holds the text instructions given to the AI during the scraping pipeline. Keeping prompts in separate text files — instead of buried in code — means you can change how the AI behaves without touching any JavaScript.

## Files

### cleanup.txt

The instructions given to Claude when it cleans up scraped content. It tells Claude exactly what to keep, what to remove, and how to format the output.

**To change cleanup behaviour:** just edit this file. Changes take effect on the very next sync run — no restart needed.

**Golden rule baked into the prompt:** Claude must never paraphrase, reword, or summarise the actual article content. It can only strip UI noise and apply markdown formatting. If Mewsy gives users wrong information because the AI rewrote the steps, that's a bug.
