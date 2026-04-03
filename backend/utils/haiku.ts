/**
 * haiku.ts
 *
 * Thin wrapper around a raw Haiku API call.
 * Extracted into a separate module so it can be mocked in unit tests
 * without mocking the entire claude.ts module.
 *
 * ── Prompt Caching ───────────────────────────────────────────────────────────
 * The beta header enables prompt caching for Haiku. The user content block is
 * marked with cache_control so repeated identical prompts (e.g. the same
 * category list sent by multiple concurrent users) are served from cache.
 * Caching only activates when the prompt exceeds the minimum token threshold;
 * shorter prompts are silently not cached.
 */

import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '../config.ts';

export const HAIKU_MODEL = 'claude-haiku-4-5-20251001';

// Beta header required by Anthropic to enable prompt caching.
// Exported so tests can call the client directly to inspect usage.cache_read_input_tokens.
export const haikuClient = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  defaultHeaders: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
  maxRetries: 4,
});

/**
 * Sends a single prompt to Haiku and returns the raw text response.
 * Used by selectRelevantCategories() and can be mocked in unit tests.
 */
export async function callHaiku(prompt: string): Promise<string> {
  const response = await haikuClient.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 120,
    temperature: 0,
    messages: [{
      role: 'user',
      content: [{
        type: 'text',
        text: prompt,
        // reason: cache_control is accepted at runtime but not yet in SDK types
        // @ts-ignore
        cache_control: { type: 'ephemeral' },
      }],
    }],
  });
  return response.content?.[0]?.type === 'text' ? response.content[0].text.trim() : '';
}

/**
 * Same as callHaiku but returns the full Anthropic API response object.
 * Exported for tests that need to inspect usage.cache_creation_input_tokens
 * and usage.cache_read_input_tokens to verify prompt caching is active.
 */
export async function callHaikuWithUsage(prompt: string) {
  return haikuClient.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 120,
    temperature: 0,
    messages: [{
      role: 'user',
      content: [{
        type: 'text',
        text: prompt,
        // @ts-ignore
        cache_control: { type: 'ephemeral' },
      }],
    }],
  });
}
