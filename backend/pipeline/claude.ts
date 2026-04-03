/**
 * claude.ts
 *
 * The only file that talks directly to the Anthropic API.
 * Everything else in the backend goes through this file to reach Claude.
 *
 * It has two distinct jobs:
 *
 *   1. chat() — the main answer function
 *      Takes a user message + the pre-loaded knowledge documents,
 *      sends them to Claude with the full conversation history,
 *      and returns the reply text.
 *
 *   2. selectRelevantFiles() — the routing function
 *      A separate, stateless Claude call that receives the user's question
 *      and a numbered list of available knowledge files, then returns
 *      which file indices are relevant along with a confidence score.
 *      This runs before chat() so that only the right documents are loaded.
 *
 * ── Prompt Caching ────────────────────────────────────────────────────────────
 *
 * Prompt caching is enabled for the chat() function only — the one that
 * generates the actual reply shown to the user. The routing call
 * (selectRelevantFiles) is intentionally not cached: it's tiny and its
 * input changes with every question.
 *
 * How caching works here:
 *   The system prompt is split into separate content blocks:
 *
 *   Block 1 — Base prompt (Mewsie's rules and personality from prompts/system.ts)
 *     This text is identical on every single call. Marked with cache_control
 *     so Anthropic stores it server-side for 5 minutes.
 *
 *   Block 2 — Knowledge content (the .md files loaded by agent.ts)
 *     This changes with every question, so it is NOT cached.
 *
 *   Block 3 — Session context (injected dynamically, not cached)
 *     Contains the current session's language, tools, setup type, etc.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TextBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages/messages';
import { ANTHROPIC_API_KEY } from '../config.ts';
import { baseSystemPrompt } from '../../prompts/system.ts';
import { getHistory, addToHistory } from './session.ts';
import {
  ROUTER_MAX_DOCS,
} from '../config/Mewsie.config.ts';
import { callHaiku } from '../utils/haiku.ts';
import type { ManifestCategory } from '../types/manifest.ts';

// The beta header is required by Anthropic to enable prompt caching.
// maxRetries: 4 — handles transient 529 overload errors with exponential backoff.
// Exported so tests can call it directly to inspect usage.cache_read_input_tokens.
export const clientWithCaching = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  defaultHeaders: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
  maxRetries: 4,
});

// Matches the sentinel values set in agent.ts.
const BASIC_MODE = '__BASIC_MODE__';
const CLARIFY_MODE_PREFIX = '__CLARIFY_MODE__';

// Routing uses Haiku — fast, cheap, deterministic classification task.
export const ROUTING_MODEL = 'claude-haiku-4-5-20251001';

// Answering uses Sonnet — needs to reason from documentation and respond conversationally.
export const ANSWER_MODEL = 'claude-sonnet-4-6';

// Maximum number of tokens Claude is allowed to use in its reply
const MAX_TOKENS = 2048;

// Temperature: 0.1 keeps responses close to source docs while allowing natural phrasing.
const TEMPERATURE = 0.1;

// Shape of the session context object passed from agent.ts
interface SessionContext {
  language: string | null;
  tools: string[];
  setupType: string | null;
  lastLoadedDocIds: string[];
  frustrationCounter: number;
  clarifyRoundCounter: number;
  previousQuestion: string | null;
}

// ── System prompt builder ──────────────────────────────────────────────────────

// Returns the system prompt as an array of content blocks for prompt caching.
//
// Block 1: the base system prompt — always identical, always cached.
// Block 2: the knowledge content for this specific request — dynamic, not cached.
// Block 3: the session context — dynamic, not cached. Added only when provided.
export function buildSystemPrompt(
  knowledgeContent: string | null = null,
  sessionContext: SessionContext | null = null
): TextBlockParam[] {
  // Block 1 — static base prompt, marked for caching.
  const blocks: TextBlockParam[] = [
    {
      type: 'text',
      text: baseSystemPrompt,
      // reason: Anthropic SDK cache_control is not yet in the TextBlockParam type but is accepted at runtime
      // @ts-ignore
      cache_control: { type: 'ephemeral' },
    },
  ];

  // Block 2 — dynamic knowledge content.
  if (knowledgeContent === BASIC_MODE) {
    blocks.push({
      type: 'text',
      text: '[No matching documentation was found for this question. Do not guess or make up information. Ask the user one short, targeted clarifying question to understand what they need. Write exactly 4 bullet options (- option), each covering a distinct likely topic. Always add "- Something else" as the 5th and final bullet. Never fewer than 4, never more than 4 main options.]',
    });
  } else if (typeof knowledgeContent === 'string' && knowledgeContent.startsWith(CLARIFY_MODE_PREFIX)) {
    const candidates = knowledgeContent.slice(CLARIFY_MODE_PREFIX.length).trim();
    blocks.push({
      type: 'text',
      text: `[The question was ambiguous. These documents might be relevant:\n${candidates}\n\nAsk the user ONE targeted clarifying question. Write exactly 4 bullet options (- option). Each option must reflect a specific candidate topic — not a generic placeholder. If there are fewer than 4 candidate documents, generate plausible related topic options to reach exactly 4. Always add "- Something else" as the 5th and final bullet. Never fewer than 4, never more than 4 main options. Do not answer yet.]`,
    });
  } else if (knowledgeContent) {
    blocks.push({
      type: 'text',
      text: 'DOCUMENTS\n\n' + knowledgeContent,
    });
  }

  // Block 3 — session context, injected when available.
  if (sessionContext && typeof sessionContext === 'object') {
    const contextText = [
      'SESSION CONTEXT',
      `Language: ${sessionContext.language || 'not specified'}`,
      `Known tools: ${sessionContext.tools && sessionContext.tools.length > 0 ? sessionContext.tools.join(', ') : 'none mentioned'}`,
      `Setup type: ${sessionContext.setupType || 'not confirmed'}`,
      `Clarification rounds so far: ${sessionContext.clarifyRoundCounter ?? 0}`,
      `Frustration level: ${sessionContext.frustrationCounter ?? 0}/3`,
    ].join('\n');

    blocks.push({
      type: 'text',
      text: contextText,
    });
  }

  return blocks;
}

// ── Main answer function ───────────────────────────────────────────────────────

// Sends a user message to Claude and returns the reply.
// Uses clientWithCaching so the base system prompt is cached between calls.
// Reads and updates the conversation history for this session.
export async function chat(
  sessionId: string,
  userMessage: string,
  knowledgeContent: string | null = null,
  sessionContext: SessionContext | null = null
): Promise<string> {
  // Get the conversation history for this session
  const history = getHistory(sessionId);

  // Build the full message list: everything said so far + the new message.
  // Cast history entries to MessageParam — history roles are always 'user' | 'assistant'
  // as enforced by addToHistory(), but TypeScript sees the broader string type.
  const messages: MessageParam[] = [
    ...(history as MessageParam[]),
    { role: 'user', content: userMessage },
  ];

  const response = await clientWithCaching.messages.create({
    model: ANSWER_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: buildSystemPrompt(knowledgeContent, sessionContext),
    messages,
  });

  const replyText = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
  // Strip em dashes — the system prompt bans them but Claude occasionally produces them anyway.
  // Replace " — " with ", " and any remaining bare "—" with " - ".
  const replyClean = replyText.replace(/ — /g, ', ').replace(/—/g, ' - ');
  const reply = response.stop_reason === 'max_tokens' ? replyClean + '[cutshort]' : replyClean;

  // Save this message pair to the session history
  addToHistory(sessionId, 'user', userMessage);
  addToHistory(sessionId, 'assistant', reply);

  return reply;
}

// ── Stage 1: Category router ───────────────────────────────────────────────────

/**
 * Asks Haiku which categories (folders) are relevant to the user's question.
 * Returns an array of matched category IDs (0, 1, or 2 entries).
 * Returns empty array on any error — agent.ts falls back to full search or BASIC_MODE.
 */
export async function selectRelevantCategories(
  userMessage: string,
  categories: ManifestCategory[]
): Promise<string[]> {
  if (categories.length === 0) return [];

  const categoryList = categories
    .map((c, i) => `${i}: ${c.label}${c.description ? `\n   ${c.description}` : ''}`)
    .join('\n\n');

  const prompt = `You are a knowledge base router. Given a user's question and a list of knowledge base categories, decide which categories contain relevant information.

Categories:
${categoryList}

User question: "${userMessage}"

Rules:
- Return only categories that are clearly relevant to the question
- If the question spans multiple categories, return all of them
- If nothing matches, return an empty array
- Do NOT return more than 3 categories
- Do NOT guess — if you are unsure, return fewer categories, not more

Return a JSON object with exactly these fields:
{"matches": [<array of category index numbers — can be empty>], "confidence": <0.0 to 1.0>}

Return ONLY valid JSON. No markdown. No explanation.`;

  try {
    const response = await callHaiku(prompt);
    console.log(`[Stage 1] Haiku raw: ${response.slice(0, 200)}`);
    const cleaned = response.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { matches?: unknown; confidence?: unknown };
    const matches: number[] = Array.isArray(parsed.matches) ? parsed.matches as number[] : [];
    const matchedIds = matches
      .filter((i): i is number => typeof i === 'number' && i >= 0 && i < categories.length)
      .map(i => categories[i].id);
    const conf = typeof parsed.confidence === 'number' ? parsed.confidence.toFixed(2) : '?';
    console.log(`[Stage 1] → categories: [${matchedIds.join(', ') || 'none'}] (conf: ${conf})`);
    return matchedIds;
  } catch (error) {
    console.error('[Stage 1] Category routing failed, falling back:', error);
    return [];
  }
}

// ── Routing function ───────────────────────────────────────────────────────────

// Page object shape used by the router.
// Accepts both `label` (from ManifestPage in agent.ts) and `title` (from ManifestFile directly).
interface Page {
  id: string;
  label?: string;   // set by flattenManifest() from file.title
  title?: string;   // raw ManifestFile field — accepted for test convenience
  description: string;
  keywords?: string[];
  trigger_questions?: string[];
  path: string;
}

// Formats a single manifest entry for the Haiku routing list.
// Exported so it can be unit-tested in isolation.
export function formatManifestEntry(page: Page, index: number): string {
  const name = page.label ?? page.title ?? page.id;
  const kwLine = page.keywords?.length ? `\n   Keywords: ${page.keywords.join(', ')}` : '';
  const questions = page.trigger_questions && page.trigger_questions.length > 0
    ? `\n   Questions: ${page.trigger_questions.join(' | ')}`
    : '';
  return `${index}: ${name}\n   ${page.description}${kwLine}${questions}`;
}

// History entry shape
interface HistoryEntry {
  role: string;
  content: string;
}

// Asks Claude which knowledge files are relevant to a given question.
// Returns { indices: number[], confidence: number }.
//
// pages: array of { label, description, path } objects (the full doc list)
// userMessage: the current user question
// conversationHistory: optional array of {role, content} pairs for context
export async function selectRelevantFiles(
  pages: Page[],
  userMessage: string,
  conversationHistory: HistoryEntry[] = []
): Promise<{ indices: number[]; confidence: number }> {
  if (pages.length === 0) return { indices: [], confidence: 0.0 };

  // Build a numbered list of documents for Claude to choose from.
  // Include keywords and trigger_questions for stronger routing signal.
  const list = pages
    .map((p, i) => formatManifestEntry(p, i))
    .join('\n\n');

  // Build the user prompt — include recent conversation history when provided.
  let userPromptContent = '';
  if (conversationHistory.length > 0) {
    const historyText = conversationHistory
      .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    userPromptContent = `Recent conversation:\n${historyText}\n\nCurrent question: ${userMessage}`;
  } else {
    userPromptContent = `Question: ${userMessage}`;
  }

  userPromptContent += `\n\nAvailable documents:\n${list}`;

  try {
    const response = await clientWithCaching.messages.create({
      model: ROUTING_MODEL,
      max_tokens: 60,
      temperature: 0,
      // Static system prompt marked for caching — identical on every call so it
      // can be served from the prompt cache after the first request.
      system: [{
        type: 'text',
        text: `You are a document routing agent. Your only job is to select relevant documents from the list provided.

Return ONLY a JSON object in this exact format: {"docs": [index numbers], "confidence": 0.0-1.0}
- docs: array of integer indices from the document list (0-based)
- confidence: float from 0.0 to 1.0 representing how confident you are these documents answer the question
- Return ALL documents that are relevant to answering this question — not just the most relevant one
- If the question spans multiple topics, return all matching documents
- Return up to ${ROUTER_MAX_DOCS} matches. Do not return a document if its individual confidence would be below 0.65
- Return {"docs": [], "confidence": 0.0} if no documents are relevant
- NEVER return explanations, NEVER return document names, ONLY return the JSON object`,
        // reason: cache_control is accepted at runtime but not yet in SDK types
        // @ts-ignore
        cache_control: { type: 'ephemeral' },
      }],
      messages: [{ role: 'user', content: userPromptContent }],
    });

    const raw = response.content?.[0]?.type === 'text' ? response.content[0].text.trim() : '';
    console.log(`[Stage 2] Haiku raw: ${raw.slice(0, 200)}`);

    // Strip markdown code fences if Claude wrapped the JSON (e.g. ```json ... ```)
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

    // Parse the JSON response
    try {
      const parsed = JSON.parse(cleaned) as { docs?: unknown; confidence?: unknown };
      const indices = (Array.isArray(parsed.docs) ? parsed.docs : [])
        .filter((i): i is number => Number.isInteger(i) && (i as number) >= 0 && (i as number) < pages.length);
      const confidence = typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.0;
      const selectedLabels = indices.map(i => `${pages[i]?.label ?? pages[i]?.title ?? pages[i]?.id ?? i}`);
      console.log(`[Stage 2] → docs: [${selectedLabels.join(', ') || 'none'}] (conf: ${confidence.toFixed(2)})`);
      return { indices, confidence };
    } catch (parseErr) {
      console.error(`[claude] selectRelevantFiles JSON parse failed: ${(parseErr as Error).message} — raw: ${raw}`);
      return { indices: [], confidence: 0.0 };
    }
  } catch (err) {
    console.error(`[claude] selectRelevantFiles failed: ${(err as Error).message}`);
    return { indices: [], confidence: 0.0 };
  }
}
