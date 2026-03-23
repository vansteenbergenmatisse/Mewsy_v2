import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.js';
import { logger } from '../utils/logger.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Expands embedded markdown links so the full URL is always visible in plain text.
 *
 * [some text](https://example.com)  →  some text (https://example.com)
 *
 * This matters because Mewsy passes these docs as plain text to Claude, so a link
 * embedded in a word would be invisible to the user. Writing the URL out explicitly
 * means users can always see and visit the referenced page.
 *
 * Image links (![...]) are left untouched — they're already stripped by cleanup.
 * Relative URLs (no http) are left untouched — they're unusable outside the source site.
 */
function expandLinks(markdown) {
  return markdown.replace(/(?<!!)\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');
}

/**
 * Reads the cleanup prompt from disk on every call so changes take effect
 * without restarting the scraper.
 */
function readCleanupPrompt() {
  return readFileSync(join(process.cwd(), config.cleanupPromptPath), 'utf8');
}

/**
 * Runs the AI cleanup agent on raw scraped content.
 *
 * On success: returns { content: cleanedMarkdown, failed: false }
 * On Claude API failure: returns { content: rawWithHeader, failed: true }
 *   — never discards content, always saves something
 */
export async function cleanContent(rawContent) {
  const systemPrompt = readCleanupPrompt();
  try {
    const response = await client.messages.create({
      model: config.cleanupModel,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: rawContent }],
    });
    return { content: expandLinks(response.content[0].text), failed: false };
  } catch (err) {
    logger.warn(`Cleanup agent failed: ${err.message} — saving raw content`);
    return {
      content: `<!-- CLEANUP FAILED: raw content -->\n\n${rawContent}`,
      failed: true,
    };
  }
}

/**
 * Generates a one-sentence routing description and 8-12 keywords for the manifest.
 * Uses the first 3000 chars of the cleaned content to keep the call cheap.
 * Returns fallback values on failure — never throws.
 *
 * Returns { description: string, keywords: string[] }
 */
export async function generateMetadata(cleanedContent) {
  try {
    const response = await client.messages.create({
      model: config.cleanupModel,
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are generating metadata for a knowledge routing system. Given the document below, return ONLY a JSON object with two fields:
- "description": one sentence (max 30 words) describing what this document covers, written to help an AI routing agent decide whether to load it
- "keywords": an array of 8-12 specific terms, product names, or concepts that appear in this document

Return only the JSON object, no explanation.

Document:
${cleanedContent.slice(0, 3000)}`,
      }],
    });
    const raw = response.content[0].text.trim();
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      description: parsed.description ?? 'No description available.',
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
    };
  } catch (err) {
    logger.warn(`Metadata generation failed: ${err.message}`);
    return { description: 'No description available.', keywords: [] };
  }
}
