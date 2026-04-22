/**
 * claude.ts
 *
 * The only file that talks directly to the Anthropic API.
 * Everything else in the backend goes through this file to reach Claude.
 *
 * Functions:
 *
 *   1. chat() — the main answer function
 *      Takes a user message + the pre-loaded knowledge documents + a context
 *      summary, sends them to Sonnet with the full conversation history,
 *      and returns the reply text.
 *
 *   2. verifyDocuments() — Stage 2A routing
 *      Haiku receives the shortlisted doc metadata (title, description, keywords,
 *      trigger questions — not full content) and returns a `passes: boolean` + one
 *      sentence of reasoning for each doc. No confidence float — only a boolean.
 *
 *   3. recoverRouting() — Stage 2B recovery
 *      Called when Stage 2A does not meet the pass threshold. Haiku inspects the
 *      Stage 2A reasoning and decides: Decision A (ask more, CLARIFY) or Decision B
 *      (admit no docs available). Forced to Decision B when clarifyRoundCount ≥ MAX.
 *
 *   4. generateClarifyQuestion() — CLARIFY mode
 *      Sync (no Haiku). Picks button labels from manifest keywords of matched docs.
 *      THEME_OVERFLOW: strips shared keywords, uses discriminating ones. All other
 *      triggers: uses highest-frequency keywords. Filters previously answered options.
 *      Returns null if no discriminating keywords found (caller uses static fallback).
 *
 *   5. generateClarifyingQuestions() — BASIC mode only
 *      Sync (no Haiku). Returns static category buttons with optional context-aware
 *      prepend (up to 3 keywords from the user's message prepended to generic categories).
 *
 *   6. generateIntroLine() — CLARIFY and BASIC mode
 *      Async (Haiku, max_tokens: 40). Generates a single warm, context-aware sentence
 *      acknowledging the user's question, prepended before the button block.
 *      Returns "" on error — callers silently fall back to buttons-only format.
 *
 * ── Prompt Caching ────────────────────────────────────────────────────────────
 *
 *   Block 1 — Base prompt (always identical, cached)
 *   Block 2 — Query context summary + knowledge content (dynamic, not cached)
 *   Block 3 — Session context (dynamic, not cached)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { TextBlockParam, MessageParam } from '@anthropic-ai/sdk/resources/messages/messages';
import { ANTHROPIC_API_KEY } from '../config.ts';
import { baseSystemPrompt } from '../../prompts/system.ts';
import { getHistory, addToHistory } from './session.ts';
import { callHaiku, haikuClient, HAIKU_MODEL } from '../utils/haiku.ts';

// The beta header is required by Anthropic to enable prompt caching.
// maxRetries: 4 — handles transient 529 overload errors with exponential backoff.
// Exported so tests can call it directly to inspect usage.cache_read_input_tokens.
export const clientWithCaching = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  defaultHeaders: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
  maxRetries: 4,
});

// Matches the sentinel value set in agent.ts.
const BASIC_MODE = '__BASIC_MODE__';

// ── Language resolution for Haiku-driven responses ────────────────────────────
//
// Maps the frontend language code to a plain-English language name used in
// Haiku prompts. Swiss German and Austrian German map to standard German —
// Haiku rarely produces dialectal output anyway and standard German is the
// safest target. Regional codes (e.g. "de-ch") fall back to the base language
// via `l.split('-')[0]` inside `langName()`.
const LANG_NAMES: Record<string, string> = {
  en: 'English',
  de: 'German',
  fr: 'French',
  nl: 'Dutch',
};

export function langName(lang: string | null): string {
  const l = lang || 'en';
  return LANG_NAMES[l] || LANG_NAMES[l.split('-')[0]] || 'English';
}

// Small internal i18n table used by the three sync generators below
// (generateClarifyQuestion, generateClarifyingQuestions, short-token path).
// Button labels stay in English on purpose — Stage 1 keyword matching is
// English-only and localised button text would break the routing round-trip.
const BACKEND_STRINGS: Record<string, Record<string, string>> = {
  clarifyQuestion: {
    en: 'Which of these best matches what you need?',
    de: 'Welches dieser Themen passt am besten zu dem, was du brauchst?',
    fr: 'Lequel de ces sujets correspond le mieux à ce que vous cherchez ?',
    nl: 'Welk van deze onderwerpen past het beste bij wat je nodig hebt?',
  },
  basicQuestion: {
    en: 'What can I help you with?',
    de: 'Womit kann ich dir helfen?',
    fr: 'Comment puis-je vous aider ?',
    nl: 'Waarmee kan ik je helpen?',
  },
};

export function tStr(map: Record<string, string>, lang: string | null): string {
  const l = lang || 'en';
  return map[l] || map[l.split('-')[0]] || map.en;
}

export function clarifyQuestionText(lang: string | null): string {
  return tStr(BACKEND_STRINGS.clarifyQuestion, lang);
}

export function basicQuestionText(lang: string | null): string {
  return tStr(BACKEND_STRINGS.basicQuestion, lang);
}

// ── Answer contract types ──────────────────────────────────────────────────────

// Structured payload Sonnet appends to every ANSWER response (stripped before
// it reaches the user). Records what was covered, which docs were used, and
// what gaps remain so the post-answer gate can make smart routing decisions.
export interface AnswerContract {
  topics_covered: string[];
  docs_used: string[];
  open_threads: string[];
}

export type AnswerSignal = 'COMPLETE' | 'PARTIAL';

export type TierSignal = 'bronze' | 'silver' | 'gold';

// Return type of chat() — includes the visible reply plus the parsed signal
// and contract that the pipeline stores on the session for post-answer routing.
export interface ChatResult {
  reply: string;
  signal: AnswerSignal | null;
  contract: AnswerContract | null;
  tier: TierSignal | null;
}

// Routing uses Haiku — fast, cheap, deterministic classification task.
export const ROUTING_MODEL = 'claude-haiku-4-5-20251001';

// Answering uses Sonnet — needs to reason from documentation and respond conversationally.
export const ANSWER_MODEL = 'claude-sonnet-4-6';

// Maximum number of tokens Claude is allowed to use in its reply
const MAX_TOKENS = 2048;

// Temperature: 0.1 keeps responses close to source docs while allowing natural phrasing.
const TEMPERATURE = 0.1;

// SessionContext is imported from the shared type definition
import type { SessionContext } from '../types/session-context.ts';

// Structured payload that summarises everything known about the current query.
// Passed to buildSystemPrompt() so Sonnet has full context regardless of mode.
export interface QueryContext {
  originalQuestion: string;
  clarifyingQA?: { q: string; a: string }[];    // all answers from clarification rounds
  selectedFiles?: string[];                       // file titles that were loaded
  answerContract?: AnswerContract;               // contract from the previous ANSWER turn (Lane A / PARTIAL path)
}

// ── System prompt builder ──────────────────────────────────────────────────────

// Returns the system prompt as an array of content blocks for prompt caching.
//
// Block 1: the base system prompt — always identical, always cached.
// Block 2: query context summary + knowledge content — dynamic, not cached.
// Block 3: the session context — dynamic, not cached. Added only when provided.
export function buildSystemPrompt(
  knowledgeContent: string | null = null,
  sessionContext: SessionContext | null = null,
  queryContext: QueryContext | null = null
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

  // Block 2 — query context summary + knowledge content.
  // The context summary is always prepended when available so Sonnet has the full
  // picture of what the user originally asked, what clarifications were given,
  // which files were loaded, and which sections are most likely relevant.
  const contentParts: string[] = [];

  // LANGUAGE LOCK — the authoritative, non-negotiable language directive.
  //
  // Placed at the very top of Block 2 (above DOCUMENTS) so Sonnet processes
  // it before anything else. This exists because the base system prompt's
  // Language section alone is not strong enough to override the pull of
  // conversation history: if the user had earlier turns in French and then
  // switches to English, Sonnet was imitating the recent French assistant
  // turns. The LANGUAGE LOCK tells it in no uncertain terms that the
  // session language wins over history, user phrasing, and documents.
  //
  // Only emitted when a language is actually on the session context —
  // first-turn requests where the frontend has not yet reported a language
  // fall through to the base prompt's generic rules, which is fine because
  // there's no history yet to override.
  if (sessionContext?.language) {
    const lockLangName = langName(sessionContext.language);
    contentParts.push(
      `LANGUAGE LOCK\n` +
      `You MUST write your entire response in ${lockLangName}. ` +
      `This is a hard lock and overrides everything else in this prompt, ` +
      `everything in DOCUMENTS, the language of prior assistant turns in ` +
      `the conversation history, and the language of the user's current ` +
      `message. Do not switch languages under any circumstances. Product ` +
      `names (Omniboost, Mews, Xero, QuickBooks, Datev, NetSuite, etc.) ` +
      `stay in English regardless. This applies to every single sentence, ` +
      `including any callouts, bullet lists, titles, and the [ANSWER:...] / ` +
      `[ANSWER_CONTRACT] tail blocks' surrounding content.`
    );
  }

  if (queryContext) {
    const summaryLines = ['QUERY CONTEXT', `Original question: ${queryContext.originalQuestion}`];

    if (queryContext.clarifyingQA && queryContext.clarifyingQA.length > 0) {
      summaryLines.push('Clarification answers:');
      for (const pair of queryContext.clarifyingQA) {
        summaryLines.push(`  Q: ${pair.q}  →  A: ${pair.a}`);
      }
    }

    if (queryContext.selectedFiles && queryContext.selectedFiles.length > 0) {
      summaryLines.push(`Selected files: ${queryContext.selectedFiles.join(', ')}`);
    }

    if (queryContext.answerContract) {
      const c = queryContext.answerContract;
      summaryLines.push('Previous answer contract:');
      if (c.topics_covered.length > 0) {
        summaryLines.push(`  Topics covered: ${c.topics_covered.join(', ')}`);
      }
      if (c.open_threads.length > 0) {
        summaryLines.push(`  Open threads: ${c.open_threads.join(', ')}`);
      }
    }

    contentParts.push(summaryLines.join('\n'));
  }

  if (knowledgeContent === BASIC_MODE) {
    contentParts.push('[No matching documentation was found for this question. Do not guess or make up information. Answer only from what you know about Omniboost and Mews — if the topic is outside that scope, say so briefly and ask the user one short clarifying question to redirect them. Write exactly 4 bullet options (- option), each covering a distinct likely topic. Always add "- Something else" as the 5th and final bullet. Never fewer than 4, never more than 4 main options.]');
  } else if (knowledgeContent) {
    contentParts.push('DOCUMENTS\n\n' + knowledgeContent);
  }

  if (contentParts.length > 0) {
    blocks.push({ type: 'text', text: contentParts.join('\n\n') });
  }

  // Block 3 — session context, injected when available.
  if (sessionContext && typeof sessionContext === 'object') {
    // Sanitize companyName to prevent prompt injection — strip anything that
    // looks like an instruction, keep only alphanumeric, spaces, and basic punctuation.
    const rawCompany = sessionContext.companyName || '';
    const safeCompany = rawCompany
      .replace(/[\n\r]/g, ' ')           // no newlines (block injection)
      .replace(/[^\p{L}\p{N}\s&.,''()\-]/gu, '') // keep letters, numbers, basic punctuation
      .slice(0, 100)                      // cap length
      .trim() || 'not known';

    const contextText = [
      'SESSION CONTEXT',
      `Language: ${sessionContext.language || 'not specified'}`,
      `Known tools: ${sessionContext.tools && sessionContext.tools.length > 0 ? sessionContext.tools.join(', ') : 'none mentioned'}`,
      `Setup type: ${sessionContext.setupType || 'not confirmed'}`,
      `Tier: ${sessionContext.tier || 'not confirmed'}`,
      `Company: ${safeCompany}`,
      `Clarification rounds so far: ${sessionContext.clarifyRoundCounter ?? 0}`,
      `Frustration level: ${sessionContext.frustrationCounter ?? 0}/3`,
    ].join('\n');

    blocks.push({ type: 'text', text: contextText });
  }

  return blocks;
}

// ── Main answer function ───────────────────────────────────────────────────────

// Sends a user message to Claude and returns the reply plus the parsed
// completion signal and answer contract (both stripped from the visible text).
// Uses clientWithCaching so the base system prompt is cached between calls.
// Reads and updates the conversation history for this session.
export async function chat(
  sessionId: string,
  userMessage: string,
  knowledgeContent: string | null = null,
  sessionContext: SessionContext | null = null,
  queryContext: QueryContext | null = null
): Promise<ChatResult> {
  // Get the conversation history for this session
  const history = getHistory(sessionId);

  // Defensive strip of legacy inline language directives.
  //
  // Older frontend code prepended `[System note: the user has switched
  // their language to X. ...]` to user messages on first send and on
  // language change. That directive then sat in stored history forever,
  // and after a subsequent language switch Sonnet would see contradictory
  // "respond in French" / "respond in English" directives in different
  // history turns. The LANGUAGE LOCK block now carries the authoritative
  // signal, so these inline notes are noise at best and harmful at worst.
  const cleanedHistory = history.map(entry => {
    if (entry.role !== 'user' || typeof entry.content !== 'string') return entry;
    return { ...entry, content: entry.content.replace(/^\[System note:[^\]]*\]\s*\n\n/, '') };
  });

  // Build the full message list: everything said so far + the new message.
  // Cast history entries to MessageParam — history roles are always 'user' | 'assistant'
  // as enforced by addToHistory(), but TypeScript sees the broader string type.
  const messages: MessageParam[] = [
    ...(cleanedHistory as MessageParam[]),
    { role: 'user', content: userMessage },
  ];

  const response = await clientWithCaching.messages.create({
    model: ANSWER_MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    system: buildSystemPrompt(knowledgeContent, sessionContext, queryContext),
    messages,
  });

  const replyText = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
  // Strip em dashes — the system prompt bans them but Claude occasionally produces them anyway.
  // Replace " — " with ", " and any remaining bare "—" with " - ".
  const replyClean = replyText.replace(/ — /g, ', ').replace(/—/g, ' - ');
  const replyWithCutshort = response.stop_reason === 'max_tokens' ? replyClean + '[cutshort]' : replyClean;

  // ── Parse and strip completion signal ──────────────────────────────────────
  // Sonnet appends [ANSWER:COMPLETE] or [ANSWER:PARTIAL] at the very end.
  // Extract it, then strip it from the visible text.
  let signal: AnswerSignal | null = null;
  let replyNoSignal = replyWithCutshort;
  const signalMatch = replyWithCutshort.match(/\[ANSWER:(COMPLETE|PARTIAL)\]/);
  if (signalMatch) {
    signal = signalMatch[1] as AnswerSignal;
    replyNoSignal = replyWithCutshort.replace(/\s*\[ANSWER:(COMPLETE|PARTIAL)\]\s*/g, '').trimEnd();
  }

  // ── Parse and strip tier signal ────────────────────────────────────────────
  // Sonnet emits [TIER:bronze|silver|gold] when the user reveals their tier.
  let tier: TierSignal | null = null;
  const tierMatch = replyNoSignal.match(/\[TIER:(bronze|silver|gold)\]/i);
  if (tierMatch) {
    tier = tierMatch[1].toLowerCase() as TierSignal;
    replyNoSignal = replyNoSignal.replace(/\s*\[TIER:(bronze|silver|gold)\]\s*/gi, '').trimEnd();
  }

  // ── Parse and strip answer contract ────────────────────────────────────────
  // Sonnet appends [ANSWER_CONTRACT]{...}[/ANSWER_CONTRACT] after the signal.
  let contract: AnswerContract | null = null;
  let replyFinal = replyNoSignal;
  const contractMatch = replyNoSignal.match(/\[ANSWER_CONTRACT\]([\s\S]*?)\[\/ANSWER_CONTRACT\]/);
  if (contractMatch) {
    try {
      const parsed = JSON.parse(contractMatch[1].trim()) as Partial<AnswerContract>;
      contract = {
        topics_covered: Array.isArray(parsed.topics_covered) ? parsed.topics_covered : [],
        docs_used: Array.isArray(parsed.docs_used) ? parsed.docs_used : [],
        open_threads: Array.isArray(parsed.open_threads) ? parsed.open_threads : [],
      };
    } catch {
      // Malformed contract — treat as null, pipeline degrades gracefully
      console.warn('[chat] answer contract parse failed — ignoring');
    }
    replyFinal = replyNoSignal.replace(/\s*\[ANSWER_CONTRACT\][\s\S]*?\[\/ANSWER_CONTRACT\]\s*/g, '').trimEnd();
  }

  const reply = replyFinal;
  if (signal) {
    console.log(`[chat] signal=${signal} contract=${contract ? 'present' : 'null'}${tier ? ` tier=${tier}` : ''}`);
  }
  if (tier) {
    console.log(`[chat] tier signal detected: ${tier}`);
  }

  // Save this message pair to the session history (stripped of signal/contract/tier blocks)
  addToHistory(sessionId, 'user', userMessage);
  addToHistory(sessionId, 'assistant', reply);

  return { reply, signal, contract, tier };
}

// ── Stage 2A: Document verification ───────────────────────────────────────────

// Page object shape used by routing functions.
export interface Page {
  id: string;
  label?: string;   // set by flattenManifest() from file.title
  title?: string;   // raw ManifestFile field — accepted for test convenience
  description: string;
  keywords?: string[];
  trigger_questions?: string[];
  path: string;
}

// Formats a single manifest entry for Haiku's verification list.
export function formatManifestEntry(page: Page, index: number): string {
  const name = page.label ?? page.title ?? page.id;
  const kwLine = page.keywords?.length ? `\n   Keywords: ${page.keywords.join(', ')}` : '';
  const questions = page.trigger_questions && page.trigger_questions.length > 0
    ? `\n   Questions: ${page.trigger_questions.join(' | ')}`
    : '';
  return `${index}: ${name} (id: ${page.id})\n   ${page.description}${kwLine}${questions}`;
}

// History entry shape
interface HistoryEntry {
  role: string;
  content: string;
}

// QALog entry shape
interface QAEntry {
  question: string;
  answer: string;
  source: string;
}

/**
 * Stage 2A — Verifies each shortlisted doc against the user's question.
 *
 * Each doc is checked in a separate parallel Haiku call using its full .md content
 * (not just manifest metadata). This prevents false negatives caused by thin metadata.
 *
 * passes: true  = doc directly addresses the user's question
 * passes: false = tangential, too general, or clearly wrong
 * hasErrors: true = at least one doc had a file load failure or API/parse error
 *
 * When hasErrors is false and threshold is not met, the caller skips Stage 2B and
 * goes straight to BASIC — Haiku read the real content and the answer isn't there.
 * When hasErrors is true, the caller falls to Stage 2B for error-recovery.
 */
export async function verifyDocuments(
  pages: Page[],
  fileContents: Record<string, string>,
  userMessage: string,
  qaLog: QAEntry[],
  history: HistoryEntry[]
): Promise<{ results: { docId: string; reasoning: string; passes: boolean }[]; hasErrors: boolean }> {
  if (pages.length === 0) return { results: [], hasErrors: false };

  // Build a combined question that includes clarifying Q&A context.
  // When the user went through CLARIFY, the original question alone is too
  // vague for Haiku to judge relevance. Inlining the Q&A makes the full
  // intent explicit: "onboarding" + "Which integration? → Xero" becomes
  // clear enough for Haiku to match the onboarding guide.
  const combinedQuestion = qaLog.length > 0
    ? `${userMessage}\nContext from clarifying questions:\n${qaLog.map(e => `- ${e.question} → ${e.answer}`).join('\n')}`
    : userMessage;

  const historySection = history.length > 0
    ? `\nRecent conversation:\n${history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}`).join('\n')}\n`
    : '';

  let hasErrors = false;

  const results = await Promise.all(pages.map(async (page) => {
    const fileContent = fileContents[page.id];

    if (!fileContent) {
      console.warn(`[Stage 2A] No content for doc ${page.id} — marking as error`);
      hasErrors = true;
      return { docId: page.id, reasoning: 'file content unavailable', passes: false };
    }

    const prompt = `You are checking whether a single knowledge base document answers a user's question.

User question: "${combinedQuestion}"${historySection}
Document content:
---
${fileContent.slice(0, 4000)}
---

Does this document contain useful information for answering the user's question?
- passes: true if the document covers the topic the user is asking about, even if it doesn't answer every detail
- passes: true if the document would help the user with their request
- passes: false if the document is about a completely different topic
- passes: false if uncertain

Return ONLY valid JSON. No markdown. No preamble.
{"docId": "${page.id}", "reasoning": "one sentence", "passes": true or false}`;

    try {
      const resp = await haikuClient.messages.create({
        model: HAIKU_MODEL,
        max_tokens: 120,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text.trim() : '';
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      const parsed = JSON.parse(cleaned) as { docId?: string; reasoning?: string; passes?: boolean };
      return {
        docId: parsed.docId ?? page.id,
        reasoning: parsed.reasoning ?? '',
        passes: parsed.passes === true,
      };
    } catch (err) {
      console.error(`[Stage 2A] verifyDocuments failed for ${page.id}: ${(err as Error).message}`);
      hasErrors = true;
      return { docId: page.id, reasoning: 'api or parse error', passes: false };
    }
  }));

  const passing = results.filter(r => r.passes).length;
  console.log(`[Stage 2A] ${passing}/${pages.length} docs passed: ${results.map(r => `${r.docId}:${r.passes}`).join(', ')}`);
  return { results, hasErrors };
}

// ── Stage 2B: Routing recovery ─────────────────────────────────────────────────

/**
 * Stage 2B — Decides whether to ask more context (Decision A) or give up (Decision B).
 *
 * Called when Stage 2A did not meet the pass threshold.
 *
 * Decision A: "I can find better docs if I know more about the user's question."
 *   → Triggers CLARIFY mode with reason STAGE2B_NEEDS_CONTEXT.
 *   → Increments session.clarifyRoundCounter.
 *
 * Decision B: "This question cannot be answered from the available documentation."
 *   → Admits no docs available. Offers BASIC carousel for redirection.
 *   → Always chosen when clarifyRoundCount >= MAX_CLARIFY_ROUNDS.
 *
 * On parse failure: returns Decision B (safe default).
 */
export async function recoverRouting(
  pages: Page[],
  userMessage: string,
  qaLog: QAEntry[],
  history: HistoryEntry[],
  stage2aResults: { docId: string; reasoning: string; passes: boolean }[],
  clarifyRoundCount: number
): Promise<{ decision: 'A' | 'B'; reason: string }> {
  const list = pages.map((p, i) => formatManifestEntry(p, i)).join('\n\n');

  const reasoningSummary = stage2aResults
    .map(r => `  ${r.docId}: ${r.passes ? 'PASSED' : 'FAILED'} — ${r.reasoning}`)
    .join('\n');

  const qaSection = qaLog.length > 0
    ? `\nSession Q&A so far:\n${qaLog.map(e => `  Q: ${e.question}  →  A: ${e.answer}`).join('\n')}\n`
    : '';

  const prompt = `You are a routing recovery agent. Stage 2A verification found that none of the candidate documents sufficiently address the user's question.

User question: "${userMessage}"${qaSection}
Candidate documents:
${list}

Stage 2A reasoning per document:
${reasoningSummary}

Clarification rounds already used: ${clarifyRoundCount}

Make exactly one of two decisions:
- Decision A: "I can find better docs if I know more about the user's question." Choose this ONLY when there is a specific, clear gap in the Q&A log that, if filled, would let Stage 1 identify a more specific document. Be concrete about what is missing.
- Decision B: "This question cannot be answered from the available documentation." Choose this when: (a) the documents collectively do not cover this question regardless of additional context, (b) the question is clearly out of scope, or (c) clarification rounds are already high (${clarifyRoundCount} so far).

Return ONLY valid JSON. No markdown. No preamble.
Format:
{ "decision": "A" or "B", "reason": "one sentence — for internal logging only, never shown to user" }`;

  try {
    const resp = await haikuClient.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 100,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text.trim() : '';
    console.log(`[Stage 2B] Haiku raw: ${raw.slice(0, 200)}`);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { decision?: string; reason?: string };
    const decision = parsed.decision === 'A' ? 'A' : 'B';
    const reason = parsed.reason ?? `decision ${decision}`;
    return { decision, reason };
  } catch (err) {
    console.error(`[Stage 2B] recoverRouting parse failed: ${(err as Error).message}`);
    return { decision: 'B', reason: 'parse failure — defaulting to Decision B' };
  }
}

// ── CLARIFY question generator (AI-driven) ───────────────────────────────────

/**
 * Generates one targeted clarifying question with up to 4 options + "Something else".
 *
 * Uses Haiku to analyze the matched doc metadata (titles, categories) and generate
 * a disambiguating question with options that actually split the doc set into useful
 * groups. Falls back to keyword-based selection if Haiku fails.
 *
 * Returns { question, options } on success, or null if no useful question could be
 * generated (caller falls back to the static CLARIFY reply).
 */
export async function generateSmartClarifyQuestion(
  userMessage: string,
  triggerReason: string,
  matchedDocMeta: { title: string; theme: string; keywords?: string[] }[],
  previousAnswers: string[] = [],
  language: string | null = null
): Promise<{ question: string; options: string[] } | null> {
  const prevLower = new Set(previousAnswers.map(a => a.toLowerCase()));
  const targetLang = langName(language);

  const docList = matchedDocMeta
    .map(d => `- "${d.title}" (category: ${d.theme})`)
    .join('\n');

  const prevAnswerLine = previousAnswers.length > 0
    ? `\nThe user already answered: [${previousAnswers.join(', ')}]. Do NOT repeat these as options.`
    : '';

  const prompt = `You are a routing assistant for a customer support chatbot about Omniboost hotel accounting integrations.

The user asked: "${userMessage}"

This matched ${matchedDocMeta.length} documents. Here are their titles and categories:
${docList}

Your job: generate ONE short clarifying question with exactly 4 options that would help narrow down which document(s) the user actually needs. The options must be distinct, non-overlapping, and based on what distinguishes these documents from each other.

CRITICAL: Each option MUST use terms that appear in the document titles or categories listed above. Do NOT invent new topic names. If documents are onboarding guides for specific integrations, use the exact integration names from the titles (e.g., "Xero", "DATEV", "QuickBooks"). If documents span categories, use the exact category names. Every option must lead to at least one of the listed documents.

The user's latest selection was: "${userMessage}"
Generate options that go DEEPER into this specific topic. Do not re-present the same breadth of options the user already saw.

Rules:
- Options must help FILTER the documents. Each option should map to a different subset of the matched docs.
- Do NOT use UI element names like "Mews Marketplace", "Connect Integration", or "Marketplace" as options.
- Do NOT use generic phrases like "General information", "Other topics", or "Getting started".
- If documents are mostly onboarding guides for different integrations, the options should be the integration names (Xero, DATEV, QuickBooks, etc.)
- If documents span different categories (onboarding vs troubleshooting vs configuration), the options should be the category types.
- Keep options short (1-4 words each).${prevAnswerLine}

Write the question and options in ${targetLang}.
Respond with ONLY a JSON object, no explanation:
{"question": "your clarifying question", "options": ["option1", "option2", "option3", "option4"]}`;

  try {
    const resp = await haikuClient.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text.trim() : '';
    console.log(`[CLARIFY] Haiku raw: ${raw.slice(0, 300)}`);

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { question?: string; options?: string[] };

    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      console.warn('[CLARIFY] Haiku returned invalid structure — falling back to keywords');
      return null;
    }

    // Validate: each option must substring-match at least one doc title or keyword
    const allTitlesLower = matchedDocMeta.map(d => d.title.toLowerCase());
    const allKwsLower = matchedDocMeta.flatMap(d => (d.keywords ?? []).map(k => k.toLowerCase()));
    const groundedPool = [...allTitlesLower, ...allKwsLower];

    const grounded = parsed.options.filter((opt: string) => {
      const optLower = opt.toLowerCase();
      return groundedPool.some(term => term.includes(optLower) || optLower.includes(term));
    });

    // Filter out previously answered options
    const filtered = (grounded.length >= 2 ? grounded : parsed.options).filter(
      (opt: string) => !prevLower.has(opt.toLowerCase())
    );

    if (filtered.length < 2) {
      console.warn('[CLARIFY] Too few options after filtering — falling back');
      return null;
    }

    const options = [...filtered.slice(0, 4), 'Something else'];
    console.log(`[CLARIFY] AI-generated question (${triggerReason}): options: [${options.join(', ')}]`);
    return { question: parsed.question, options };
  } catch (err) {
    console.warn(`[CLARIFY] Haiku call failed: ${(err as Error).message} — falling back to keywords`);
    return null;
  }
}

// ── Clarifying questions generator (BASIC mode) ────────────────────────────────

/**
 * Returns a single-question button reply for BASIC mode (0 docs matched).
 *
 * No Haiku call. Options come from two sources:
 *   1. contextButtons — up to 3 specific keywords found in the user's message
 *      (detected by basicContextButtons in agent.ts). These are prepended so the
 *      response is relevant to what the user actually said.
 *   2. Generic fallback categories — hardcoded from the manifest category structure.
 *
 * Returns a [BUTTONS:] string the frontend renders as clickable buttons.
 */
export function generateClarifyingQuestions(
  _userMessage: string,
  _candidateSummary: string | null,
  _clarifyingQA: { q: string; a: string }[] = [],
  contextButtons: string[] = [],
  language: string | null = null
): string {
  const specific = contextButtons.slice(0, 3);
  const generic = [
    'Onboarding / setup',
    'Accounting configuration',
    'A specific integration',
    'GL mapping & ledgers',
    'Troubleshooting',
  ];
  // Merge specific + generic, dedup by lowercase, cap at 6 before "Something else"
  const seen = new Set(specific.map(s => s.toLowerCase()));
  const merged = [
    ...specific,
    ...generic.filter(g => !seen.has(g.toLowerCase())),
  ].slice(0, 6);

  const options = [...merged, 'Something else'];
  console.log(`[BASIC] Static category buttons${specific.length ? ` (context: [${specific.join(', ')}])` : ''}`);
  return `${basicQuestionText(language)} [BUTTONS: ${options.join(' | ')}]`;
}

// ── AI-driven BASIC question generator ──────────────────────────────────────────

/**
 * Generates a targeted clarifying question for BASIC mode (0 docs matched).
 *
 * Uses Haiku to analyze the user's message, prior Q&A, and the knowledge base
 * categories to ask a question that guides the user toward real topics.
 *
 * Returns { question, options } on success, or null (caller falls back to static buttons).
 */
export async function generateSmartBasicQuestion(
  userMessage: string,
  qaLog: { q: string; a: string }[],
  categories: { id: string; label: string; description: string }[],
  language: string | null
): Promise<{ question: string; options: string[] } | null> {
  const targetLang = langName(language);

  const qaSection = qaLog.length > 0
    ? `\nPrevious exchanges in this session:\n${qaLog.map(e => `Q: ${e.q}\nA: ${e.a}`).join('\n')}\n\nAsk a DIFFERENT question that digs deeper based on what you already know. Do NOT repeat previous questions.`
    : '';

  const categoryList = categories
    .map(c => `- ${c.label}: ${c.description}`)
    .join('\n');

  const prompt = `You are a routing assistant for a customer support chatbot about Omniboost hotel accounting integrations.

The user asked: "${userMessage}"
No documents matched their query directly. You need to ask a clarifying question to understand what they need.
${qaSection}

Here are the topics this knowledge base actually covers:
${categoryList}

Generate ONE clarifying question with exactly 4 options to narrow down what the user needs.
CRITICAL: Options must correspond to real topics from the list above. Do NOT invent topics that aren't covered in the knowledge base. Use the exact category names or descriptions as inspiration for options.

Keep options short (1-4 words each). Write in ${targetLang}.
Respond with ONLY a JSON object, no explanation:
{"question": "your question", "options": ["opt1", "opt2", "opt3", "opt4"]}`;

  try {
    const resp = await haikuClient.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text.trim() : '';
    console.log(`[BASIC] Haiku raw: ${raw.slice(0, 300)}`);

    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { question?: string; options?: string[] };

    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      console.warn('[BASIC] Haiku returned invalid structure — falling back to static');
      return null;
    }

    const options = [...parsed.options.slice(0, 4), 'Something else'];
    console.log(`[BASIC] AI-generated question: options: [${options.join(', ')}]`);
    return { question: parsed.question, options };
  } catch (err) {
    console.warn(`[BASIC] Haiku call failed: ${(err as Error).message} — falling back to static`);
    return null;
  }
}

// ── Dynamic intro line (CLARIFY and BASIC mode) ────────────────────────────────

/**
 * Generates a warm, context-rich 2-3 sentence lead-in acknowledging the user's question.
 * Prepended before the button block in CLARIFY and BASIC responses to make the
 * experience feel conversational rather than purely menu-driven.
 *
 * Uses Haiku with max_tokens:200 and temperature:0.7 so each response varies naturally.
 * Returns "" on any error — callers silently fall back to buttons-only format.
 */
export async function generateIntroLine(
  userMessage: string,
  triggerReason: string,
  language: string | null = null
): Promise<string> {
  try {
    const targetLang = langName(language);
    const langLine = `CRITICAL: Your entire response MUST be written in ${targetLang}. Do not use any other language under any circumstances, even if the user's message appears to be in a different language.`;

    const userContent = triggerReason === 'BASIC_NO_DOCS'
      ? `You are Mewsie, Omniboost's support assistant for hotel accounting integrations.
${langLine}
Write a warm, honest apology of 2-3 natural sentences (minimum 40 words, maximum 50 words) explaining that you could not find an answer to the user's question in your knowledge base.
Your job: briefly acknowledge what they were asking about, be upfront that you could not find coverage for it, and reassure them you're happy to help with other accounting integration topics. Keep it tight.
Do NOT make up an answer. Do NOT ask a follow-up question yourself. End with . or !
Do NOT use em-dashes (—) or dashes in your response.
Do NOT open with sycophantic phrases like "Great question!", "Certainly!", "I'd be happy to help!", "Absolutely!", "Of course!", "Sure!", "I'd love to help!", "I'd be happy to point you". Start directly with substance.
Reply with only the 2-3 sentences, nothing else.

User said: "${userMessage}"`
      : `You are Mewsie, Omniboost's support assistant for hotel accounting integrations.
${langLine}
Write a warm, context-rich lead-in of 2-3 natural sentences (minimum 40 words, maximum 50 words) before presenting options to the user.
Your job: show the user you understood their question, paraphrase what they're asking about in your own words, and set up the choice they're about to make. Sound like a knowledgeable human colleague, not a template. Keep it tight.
If the question is clearly unrelated to accounting software, Omniboost, or hotel integrations, briefly acknowledge you can't help with that topic and warmly redirect them toward what you CAN help with (accounting integrations, Mews setup, GL mapping, troubleshooting).
Do NOT answer or solve the question. Do NOT ask a follow-up question yourself (the buttons will do that). End with . or !
Do NOT use em-dashes (—) or dashes in your response.
Do NOT open with sycophantic phrases like "Great question!", "Certainly!", "I'd be happy to help!", "Absolutely!", "Of course!", "Sure!", "I'd love to help!", "I'd be happy to point you". Start directly with substance.
Reply with only the 2-3 sentences, nothing else.

User said: "${userMessage}"`;

    const response = await haikuClient.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 200,
      temperature: 0.7,
      messages: [{ role: 'user', content: userContent }],
    });
    const text = response.content?.[0]?.type === 'text' ? response.content[0].text.trim() : '';
    console.log(`[generateIntroLine] raw="${text.slice(0, 200)}" len=${text.length}`);
    if (!text || text.length > 600 || text.includes('[BUTTONS:')) return '';
    return text;
  } catch (err) {
    console.warn('[generateIntroLine] silently failed:', err);
    return '';
  }
}
