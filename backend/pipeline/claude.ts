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
 *      Haiku generates one targeted question with 4 specific options + "Something else".
 *      Receives the trigger reason (DIVERSE_TOPICS, THEME_OVERFLOW, TOO_BROAD,
 *      STAGE2B_NEEDS_CONTEXT), matched doc metadata, the session qaLog, and session
 *      context. Returns null on failure (caller falls back to static buttons).
 *
 *   5. generateClarifyingQuestions() — BASIC mode only
 *      Haiku generates exactly CLARIFY_QUESTIONS_PER_ROUND targeted questions
 *      as structured JSON. The frontend renders them as a card carousel — the
 *      user answers each without a round-trip, then all answers are sent together.
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
import {
  CLARIFY_QUESTIONS_PER_ROUND,
} from '../config/Mewsie.config.ts';
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

// Return type of chat() — includes the visible reply plus the parsed signal
// and contract that the pipeline stores on the session for post-answer routing.
export interface ChatResult {
  reply: string;
  signal: AnswerSignal | null;
  contract: AnswerContract | null;
}

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
  clarificationBundles?: { categoryIds: string[]; qaPairs: { q: string; a: string }[] }[];
}

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
    const contextText = [
      'SESSION CONTEXT',
      `Language: ${sessionContext.language || 'not specified'}`,
      `Known tools: ${sessionContext.tools && sessionContext.tools.length > 0 ? sessionContext.tools.join(', ') : 'none mentioned'}`,
      `Setup type: ${sessionContext.setupType || 'not confirmed'}`,
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
    console.log(`[chat] signal=${signal} contract=${contract ? 'present' : 'null'}`);
  }

  // Save this message pair to the session history (stripped of signal/contract blocks)
  addToHistory(sessionId, 'user', userMessage);
  addToHistory(sessionId, 'assistant', reply);

  return { reply, signal, contract };
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
 * Haiku receives doc metadata (not full content) and returns one sentence of
 * reasoning + passes: boolean per doc. No confidence float.
 *
 * passes: true  = doc directly addresses the user's question
 * passes: false = tangential, too general, or clearly wrong (including "barely" relevant)
 *
 * On parse failure: returns all docs as passes: false (triggers Stage 2B).
 */
export async function verifyDocuments(
  pages: Page[],
  userMessage: string,
  qaLog: QAEntry[],
  history: HistoryEntry[]
): Promise<{ results: { docId: string; reasoning: string; passes: boolean }[] }> {
  if (pages.length === 0) return { results: [] };

  const list = pages.map((p, i) => formatManifestEntry(p, i)).join('\n\n');

  const qaSection = qaLog.length > 0
    ? `\nSession Q&A so far:\n${qaLog.map(e => `  Q: ${e.question}  →  A: ${e.answer}`).join('\n')}\n`
    : '';

  const historySection = history.length > 0
    ? `\nRecent conversation:\n${history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.slice(0, 200)}`).join('\n')}\n`
    : '';

  const prompt = `You are verifying whether knowledge base documents are relevant to a user's question.

User question: "${userMessage}"${historySection}${qaSection}
Documents to evaluate:
${list}

For each document, decide if it directly addresses the user's question based on its title, description, keywords, and trigger questions (you do not have the full content).

Rules:
- passes: true ONLY if the document directly addresses the question — not tangentially, not partially
- passes: false if the document covers the right general area but not this specific question
- passes: false if your reasoning is hedged or uncertain
- A document with "barely relevant" metadata should always be passes: false

Return ONLY valid JSON. No markdown. No preamble. No explanation outside the JSON.
Format:
{
  "results": [
    { "docId": "string", "reasoning": "one sentence", "passes": true or false }
  ]
}

Return one entry per document, in the same order as the list above.`;

  try {
    const resp = await haikuClient.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 600,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text.trim() : '';
    console.log(`[Stage 2A] Haiku raw: ${raw.slice(0, 300)}`);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { results?: { docId?: string; reasoning?: string; passes?: boolean }[] };

    if (!Array.isArray(parsed.results)) {
      throw new Error('results array missing');
    }

    const results = parsed.results.map((r, i) => ({
      docId: r.docId ?? pages[i]?.id ?? String(i),
      reasoning: r.reasoning ?? '',
      passes: r.passes === true,
    }));

    const passing = results.filter(r => r.passes).length;
    console.log(`[Stage 2A] ${passing}/${pages.length} docs passed: ${results.map(r => `${r.docId}:${r.passes}`).join(', ')}`);
    return { results };
  } catch (err) {
    console.error(`[Stage 2A] verifyDocuments parse failed: ${(err as Error).message}`);
    // All docs fail → triggers Stage 2B
    return {
      results: pages.map(p => ({ docId: p.id, reasoning: 'parse failure', passes: false })),
    };
  }
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

// ── CLARIFY question generator ─────────────────────────────────────────────────

/**
 * Generates one targeted clarifying question with 4 specific options + "Something else".
 *
 * Receives a trigger reason from Stage 1 gating or Stage 2B:
 *   DIVERSE_TOPICS     — 1–5 docs matched but span 3+ different themes
 *   THEME_OVERFLOW     — 6+ docs matched, all within one theme (too many to verify)
 *   TOO_BROAD          — 6+ docs matched across multiple themes
 *   STAGE2B_NEEDS_CONTEXT — Stage 2B chose Decision A (specific context gap identified)
 *
 * Returns { question, options } on success, or null on any failure (caller falls
 * back to the static CLARIFY reply).
 */
export async function generateClarifyQuestion(
  userMessage: string,
  triggerReason: 'DIVERSE_TOPICS' | 'THEME_OVERFLOW' | 'TOO_BROAD' | 'STAGE2B_NEEDS_CONTEXT',
  matchedDocMeta: { title: string; theme: string }[],
  qaLog: QAEntry[],
  sessionContext: { tools?: string[]; setupType?: string | null }
): Promise<{ question: string; options: string[] } | null> {
  const reasonInstructions: Record<string, string> = {
    DIVERSE_TOPICS: 'The matched documents span several different topic areas. Ask which topic area the user needs help with. Derive the options from the distinct theme groups present in the matched documents.',
    THEME_OVERFLOW: 'Too many documents matched within the same topic area to verify individually. Ask a narrowing question within that theme to identify the specific sub-topic (e.g. which accounting system, which workflow step, which error type).',
    TOO_BROAD: 'The query matched too many documents across multiple unrelated topics. Ask the single most useful question to narrow down which topic area or integration the user actually needs.',
    STAGE2B_NEEDS_CONTEXT: 'Stage 2A verified candidate documents but none passed. Ask the specific clarifying question that would most help identify the right document — focus on what was missing from the user\'s question.',
  };

  const docList = matchedDocMeta.slice(0, 10)
    .map(d => `- ${d.title} (theme: ${d.theme})`)
    .join('\n');

  const qaSection = qaLog.length > 0
    ? `\nSession Q&A so far:\n${qaLog.map(e => `  Q: ${e.question}  →  A: ${e.answer}`).join('\n')}\n`
    : '';

  const toolsLine = sessionContext.tools?.length
    ? `Known integration: ${sessionContext.tools.join(', ')}`
    : '';
  const setupLine = sessionContext.setupType
    ? `Known setup type: ${sessionContext.setupType}`
    : '';

  const prompt = `You are generating a clarifying question for a support chatbot called Mewsy.

User message: "${userMessage}"
Trigger reason: ${triggerReason}
${toolsLine}
${setupLine}${qaSection}
Matched document candidates:
${docList}

Instruction: ${reasonInstructions[triggerReason]}

Rules:
- Return ONLY valid JSON. No markdown. No preamble. No explanation outside the JSON.
- Format: { "question": "Short question (≤12 words)?", "options": ["Option 1", "Option 2", "Option 3", "Option 4", "Something else"] }
- Exactly 4 specific options + "Something else" as the 5th and last option
- Options must be concrete, not generic (e.g. use actual integration names, not "Option A")
- Do not repeat questions already answered in the Q&A log above
- Last option must always be "Something else"`;

  try {
    const resp = await haikuClient.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 250,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = resp.content?.[0]?.type === 'text' ? resp.content[0].text.trim() : '';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as { question?: string; options?: string[] };
    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      return null;
    }
    // Normalise: strip any "Something else" variants already present, then append one
    const options = [
      ...parsed.options.filter((o: string) => !/something else/i.test(o)).slice(0, 4),
      'Something else',
    ];
    console.log(`[CLARIFY] Generated question (${triggerReason}): "${parsed.question}" | options: [${options.join(', ')}]`);
    return { question: parsed.question, options };
  } catch (err) {
    console.error(`[CLARIFY] generateClarifyQuestion failed (${triggerReason}): ${(err as Error).message}`);
    return null;
  }
}

// ── Clarifying questions generator (BASIC mode) ────────────────────────────────

/**
 * Generates CLARIFY_QUESTIONS_PER_ROUND targeted questions as structured JSON
 * for the frontend card carousel.
 *
 * Each question has exactly 4 options plus "Something else".
 * Used when 0 docs matched Stage 1 (BASIC mode) — questions are broad topic-level.
 * Also used for Stage 2B Decision B (redirect to fresh BASIC carousel).
 *
 * Returns a JSON string with __type "clarify_questions" so the frontend can detect
 * and render it as a card carousel instead of a regular message.
 * Falls back to a plain text question string on any error.
 */
export async function generateClarifyingQuestions(
  userMessage: string,
  candidateSummary: string | null,
  clarifyingQA: { q: string; a: string }[] = []
): Promise<string> {
  const contextNote = clarifyingQA.length > 0
    ? `\nPrevious clarifying answers already collected:\n${clarifyingQA.map(p => `  Q: ${p.q}  →  A: ${p.a}`).join('\n')}\nDo not repeat questions already answered.`
    : '';

  const modeInstruction = candidateSummary
    ? `These knowledge base documents might be relevant to the question:\n${candidateSummary}\n\nGenerate ${CLARIFY_QUESTIONS_PER_ROUND} targeted questions that will help identify exactly which document and section the user needs. Each question should narrow down a different dimension (e.g. which accounting system, which setup stage, which specific problem).`
    : `No matching documentation was found yet. Generate ${CLARIFY_QUESTIONS_PER_ROUND} broad questions that help identify what area the user needs help with (e.g. onboarding, accounting setup, a specific accounting system, troubleshooting).`;

  const prompt = `You are a support assistant helping to clarify a user's question before searching the knowledge base.

User question: "${userMessage}"${contextNote}

${modeInstruction}

Rules for each question:
- Short and direct (≤ 12 words)
- Provide exactly 4 answer options (not counting "Something else")
- Options must be specific — not generic placeholders
- Options must be ≤ 40 characters each
- Always include "Something else" as a 5th option
- Questions must be genuinely useful for routing — avoid redundant questions

Return a JSON object in exactly this format:
{
  "__type": "clarify_questions",
  "questions": [
    {
      "text": "Question text?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4", "Something else"]
    }
  ]
}

Return ONLY valid JSON. No markdown fences. No explanation. Exactly ${CLARIFY_QUESTIONS_PER_ROUND} questions.`;

  try {
    // Use haikuClient directly — callHaiku caps at 120 tokens which is far too small
    // for 3 questions with 5 options each (~350-400 tokens of JSON).
    const haikuResponse = await haikuClient.messages.create({
      model: HAIKU_MODEL,
      max_tokens: 700,
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    });
    const rawText = haikuResponse.content?.[0]?.type === 'text' ? haikuResponse.content[0].text.trim() : '';
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(cleaned) as {
      __type?: string;
      questions?: { text: string; options: string[] }[];
    };

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      throw new Error('questions array missing or empty');
    }

    // Normalise: ensure exactly CLARIFY_QUESTIONS_PER_ROUND questions, each with "Something else"
    const normalised = parsed.questions.slice(0, CLARIFY_QUESTIONS_PER_ROUND).map(q => ({
      text: q.text,
      options: [
        ...q.options.filter((o: string) => !/something else/i.test(o)).slice(0, 4),
        'Something else',
      ],
    }));

    // Guard: if Haiku returned fewer questions than requested, throw so the fallback
    // plain-text path handles it — a partial carousel would be confusing.
    if (normalised.length < CLARIFY_QUESTIONS_PER_ROUND) {
      throw new Error(`only ${normalised.length} question(s) generated, expected ${CLARIFY_QUESTIONS_PER_ROUND}`);
    }

    console.log(`[Clarify] Generated ${normalised.length} questions for: "${userMessage.slice(0, 60)}"`);
    return JSON.stringify({ __type: 'clarify_questions', questions: normalised });
  } catch (err) {
    console.error(`[Clarify] generateClarifyingQuestions failed: ${(err as Error).message}`);
    // Fallback to a single plain-text question so the user is never stuck
    // [BUTTONS:] prefix ensures the frontend renders as clickable buttons, not plain bullets
    return 'Could you give me a bit more detail about what you\'re looking for?\n\n[BUTTONS:]\n- Onboarding / setup\n- Accounting configuration\n- A specific accounting system\n- Something else';
  }
}
