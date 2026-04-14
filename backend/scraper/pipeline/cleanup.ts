import { readFileSync } from 'fs';
import { join } from 'path';
import Anthropic from '@anthropic-ai/sdk';
import config from '../config.ts';
import { logger } from '../utils/logger.ts';

let _client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

/**
 * Expands embedded markdown links so the full URL is always visible in plain text.
 *
 * [some text](https://example.com)  →  some text (https://example.com)
 *
 * This matters because Mewsie passes these docs as plain text to Claude, so a link
 * embedded in a word would be invisible to the user. Writing the URL out explicitly
 * means users can always see and visit the referenced page.
 *
 * Image links (![...]) are left untouched — they're already stripped by cleanup.
 * Relative URLs (no http) are left untouched — they're unusable outside the source site.
 */
export function expandLinks(markdown: string): string {
  return markdown.replace(/(?<!!)\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');
}

/**
 * Replaces em-dashes (—) with a plain hyphen-space ( - ) so they never appear
 * in chat responses or stored documents.
 */
export function removeEmDashes(markdown: string): string {
  return markdown.replace(/\s*—\s*/g, ' - ');
}

/**
 * Reads the cleanup prompt from disk on every call so changes take effect
 * without restarting the scraper.
 */
function readCleanupPrompt(): string {
  return readFileSync(join(process.cwd(), config.cleanupPromptPath), 'utf8');
}

// Return type for cleanContent
interface CleanContentResult {
  content: string;
  failed: boolean;
}

/**
 * Runs the AI cleanup agent on raw scraped content.
 *
 * On success: returns { content: cleanedMarkdown, failed: false }
 * On Claude API failure: returns { content: rawWithHeader, failed: true }
 *   — never discards content, always saves something
 */
export async function cleanContent(rawContent: string): Promise<CleanContentResult> {
  const systemPrompt = readCleanupPrompt();
  try {
    const response = await getClient().messages.create({
      model: config.cleanupModel,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: rawContent }],
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return { content: removeEmDashes(expandLinks(text)), failed: false };
  } catch (err) {
    logger.warn(`Cleanup agent failed: ${(err as Error).message} — saving raw content`);
    return {
      content: `<!-- CLEANUP FAILED: raw content -->\n\n${rawContent}`,
      failed: true,
    };
  }
}

// Return type for generateMetadata
interface MetadataResult {
  description: string;
  keywords: string[];
}

/**
 * Generates a one-sentence routing description and 8-12 keywords for the manifest.
 * Uses the first 3000 chars of the cleaned content to keep the call cheap.
 * Returns fallback values on failure — never throws.
 *
 * Returns { description: string, keywords: string[] }
 */
export async function generateMetadata(cleanedContent: string): Promise<MetadataResult> {
  try {
    const response = await getClient().messages.create({
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
    const rawText = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { description?: string; keywords?: unknown };
    return {
      description: parsed.description ?? 'No description available.',
      keywords: Array.isArray(parsed.keywords) ? (parsed.keywords as string[]) : [],
    };
  } catch (err) {
    logger.warn(`Metadata generation failed: ${(err as Error).message}`);
    return { description: 'No description available.', keywords: [] };
  }
}

// ── Tier marker injection ────────────────────────────────────────────────────
// Scans cleaned content for Bronze/Silver/Gold feature keywords and wraps
// matching paragraphs with tier markers. Pure string matching, no LLM call.

const GOLD_ONLY_FEATURES = [
  'statistics entries',
  'market segmentation',
  'advanced mapping logic',
  'advanced mapping',
  'custom journal descriptions',
  'customized journal descriptions',
  'custom line descriptions',
  'customized revenue and payment line descriptions',
  'documentation on demand',
  'quarterly optimization reviews',
];

const SILVER_PLUS_FEATURES = [
  'credit card fee splitting',
  'credit card fee split',
  'detailed revenue entries',
  'detailed payment entries',
  'detailed entries',
  'skip categories',
  'skip logic',
  'skip (exclude) specific revenue',
  'skip (exclude) specific payment',
  'direct omniboost support',
  'bi-weekly onboarding meetings',
  'introduction meeting',
];

const PRICING_EXCLUSIONS = ['€', '£', '$', 'annually', 'per property'];

const TIER_NAMES = ['bronze', 'silver', 'gold'];

/**
 * Scans cleaned markdown content for tier-specific feature keywords and injects
 * HTML comment tier markers around matching paragraphs.
 *
 * Skips paragraphs that:
 * - Already have tier markers
 * - Contain pricing terms (comparison sections)
 * - Mention 2+ tier names (comparative overview paragraphs)
 */
export function injectTierMarkers(content: string): string {
  // Split into paragraphs by double newline
  const paragraphs = content.split(/\n\n+/);
  const result: string[] = [];

  for (const para of paragraphs) {
    const lower = para.toLowerCase();

    // Skip if already has tier markers
    if (lower.includes('<!-- tier:')) {
      result.push(para);
      continue;
    }

    // Skip if contains pricing terms
    if (PRICING_EXCLUSIONS.some(term => lower.includes(term.toLowerCase()))) {
      result.push(para);
      continue;
    }

    // Skip if comparative paragraph (mentions 2+ tier names)
    const tierMentions = TIER_NAMES.filter(t => lower.includes(t));
    if (tierMentions.length >= 2) {
      result.push(para);
      continue;
    }

    // Check for Gold-only features
    if (GOLD_ONLY_FEATURES.some(feat => lower.includes(feat))) {
      result.push(`<!-- tier:gold -->\n${para}\n<!-- /tier -->`);
      continue;
    }

    // Check for Silver+ features
    if (SILVER_PLUS_FEATURES.some(feat => lower.includes(feat))) {
      result.push(`<!-- tier:silver+ -->\n${para}\n<!-- /tier -->`);
      continue;
    }

    result.push(para);
  }

  return result.join('\n\n');
}
