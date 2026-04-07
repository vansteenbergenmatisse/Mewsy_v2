/**
 * agent.ts
 *
 * The pipeline coordinator. Every user message passes through here in order:
 *
 *   Step 1 — Load the manifest
 *     Read knowledge-manifest.json to get the full list of available docs.
 *
 *   Step 2 — Stage 1: keyword filter with thematic clustering
 *     Score every doc by unique keyword+synonym hits in the user message + qaLog.
 *     Apply one of four gates based on match count (and theme for the 6+ case):
 *       Gate 1: 0 matched → BASIC
 *       Gate 2: 1–SHORTLIST_MAX matched → Stage 2A (always, regardless of theme diversity)
 *       Gate 3: 6+ matched, all one theme → CLARIFY(THEME_OVERFLOW)
 *       Gate 4: 6+ matched, multiple themes → CLARIFY(TOO_BROAD)
 *
 *   Step 3 — Stage 2A: per-doc verification
 *     Haiku reasons whether each shortlisted doc directly addresses the question.
 *     Returns passes: boolean (no confidence float).
 *     Docs not passing the threshold go to Stage 2B.
 *
 *   Step 4 — Stage 2B: routing recovery
 *     Haiku decides: Decision A (ask more → CLARIFY with STAGE2B_NEEDS_CONTEXT)
 *     or Decision B (admit no docs available → BASIC carousel).
 *     Forced to Decision B when clarifyRoundCounter >= MAX_CLARIFY_ROUNDS.
 *
 *   Step 5 — Load and answer (ANSWER mode)
 *     Read the passing .md files from disk and build one context block.
 *     Pass message + context to claude.ts, which calls the Sonnet API.
 *
 *   Step 6 — CLARIFY or BASIC
 *     CLARIFY: Haiku generates one targeted question based on trigger reason.
 *     BASIC: Haiku generates 3-question card carousel.
 *     Both append incoming Q&A pairs to session.qaLog.
 *
 *   Step 7 — Update session context
 *     Store doc IDs, extract previousQuestion, detect frustration/tools/setup type,
 *     update clarifyRoundCounter (Stage 2B Decision A only).
 *
 * ── Theme field ────────────────────────────────────────────────────────────────
 *
 * Thematic clustering uses the `theme` field on ManifestPage, which is derived
 * from the manifest `category` field (1:1 mapping). The category is the folder path
 * for scraped docs (e.g. "website/mews-help-center") and a logical grouping key for
 * manually authored docs (e.g. "mews.md", "omniboost.md"). This is the semantic
 * grouping used by Stage 1 to detect whether matched docs are coherent (1–2 themes)
 * or diverse (3+ themes). When adding new docs via the scraper, ensure the `category`
 * field is set correctly — it doubles as the routing theme.
 */

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  chat,
  verifyDocuments,
  recoverRouting,
  generateClarifyQuestion,
  generateClarifyingQuestions,
} from './claude.ts';
import type { QueryContext, Page, AnswerContract } from './claude.ts';
import {
  getSession,
  updateContext,
  addToHistory,
} from './session.ts';
import type { ClarificationBundle } from './session.ts';
import {
  ROUTER_MAX_DOCS,
  ROUTER_HISTORY_ENABLED,
  ROUTER_HISTORY_PAIRS,
  MAX_CLARIFY_ROUNDS,
  STAGE2A_SHORTLIST_MAX,
  POST_ANSWER_CLARIFY_BUDGET,
} from '../config/Mewsie.config.ts';
import type { Manifest } from '../types/manifest.ts';
import { migrateManifest } from '../scraper/pipeline/manifest.ts';

// __dirname is not available in ES modules by default — this reconstructs it
const __dirname = dirname(fileURLToPath(import.meta.url));

// Root of the project (two levels up: pipeline/ → backend/ → root)
const ROOT = join(__dirname, '../..');

// Path to the manifest that lists all available knowledge files
const INDEX_PATH = join(ROOT, 'knowledge', 'knowledge-manifest.json');

// Sentinel value passed to claude.ts when no knowledge files matched at all.
const BASIC_MODE = '__BASIC_MODE__';

// Pure greetings/acks/closings — routing is skipped for these
const SKIP_ROUTING_GREETINGS = new Set([
  'hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'got it',
  'bye', 'goodbye', 'sure', 'yes', 'no', 'yep', 'nope', 'great',
]);

// Static fallback used when generateClarifyQuestion fails (Haiku parse error).
// This should be rare — Haiku is reliable at returning JSON.
const STATIC_CLARIFY_REPLY = [
  'Could you give me a bit more context about what you\'re looking for?',
  '',
  '[BUTTONS:]',
  '- Onboarding / getting started',
  '- Accounting integration setup',
  '- GL mapping and reporting',
  '- Troubleshooting an issue',
  '- Something else',
].join('\n');

// ── ManifestPage ─────────────────────────────────────────────────────────────
//
// Shape of a flattened manifest page entry (used internally and by routing).
// `theme` is derived from `category` — see file header for explanation.

export interface ManifestPage {
  id: string;
  label: string;
  description: string;
  path: string;
  category: string;
  // Semantic grouping for Stage 1 thematic clustering. Derived from category (1:1 mapping).
  // Docs with the same theme are considered a coherent cluster.
  theme: string;
  keywords?: string[];
  synonyms?: string[];
  trigger_questions?: string[];
}

// ── Manifest loading ────────────────────────────────────────────────────────────

export function loadManifest(manifestPath: string = INDEX_PATH): Manifest {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  return migrateManifest(raw);
}

// ── Manifest flattening ─────────────────────────────────────────────────────────

// Turns the manifest's files array into a flat array.
// `theme` is set to `category` — both represent the same semantic grouping.
function flattenManifest(manifest: Manifest): ManifestPage[] {
  return manifest.files.map(file => ({
    id:               file.id,
    label:            file.title,
    description:      file.description,
    path:             file.path,
    category:         file.category,
    theme:            file.category,   // theme = category (1:1 mapping, see file header)
    keywords:         file.keywords,
    synonyms:         file.synonyms,
    trigger_questions: file.trigger_questions,
  }));
}

// ── Keyword pre-filter ──────────────────────────────────────────────────────────

// Zero-LLM pre-filter: scores each doc by how many of its unique keywords + synonyms
// appear in the user message (substring match, case-insensitive, deduplicated).
// Returns only matched docs, ranked by overlap count. No fallback, no cap.
// Exported for unit testing.
export function keywordPreFilter(pages: ManifestPage[], userMessage: string): ManifestPage[] {
  return keywordPreFilterScored(pages, userMessage).map(s => s.page);
}

// Internal scored version — returns hit counts needed for gate logic.
function keywordPreFilterScored(
  pages: ManifestPage[],
  userMessage: string
): { page: ManifestPage; hits: number }[] {
  const msgLower = userMessage.toLowerCase();
  return pages
    .map(page => {
      // Deduplicate keywords + synonyms so a repeated term never inflates the score.
      const terms = [...new Set([...(page.keywords ?? []), ...(page.synonyms ?? [])])];
      const hits = terms.filter(t => msgLower.includes(t.toLowerCase())).length;
      return { page, hits };
    })
    .filter(s => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);
}

// ── Thematic coherence ──────────────────────────────────────────────────────────

// Determines whether a set of matched docs forms a coherent cluster.
// Coherent = 1 or 2 distinct themes. Diverse = 3+ distinct themes.
function computeThematicCoherence(docs: ManifestPage[]): {
  coherent: boolean;
  themes: string[];
  dominantTheme: string | null;
} {
  const themes = [...new Set(docs.map(d => d.theme))];
  const coherent = themes.length <= 2;
  const counts = new Map<string, number>();
  for (const d of docs) counts.set(d.theme, (counts.get(d.theme) ?? 0) + 1);
  const dominantTheme = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { coherent, themes, dominantTheme };
}

// ── Topic overlap check ─────────────────────────────────────────────────────────

// Returns true when the user's follow-up message shares vocabulary with the topics
// or open threads from the previous answer contract. Used to detect continuation
// (Lane A) vs. a genuinely new question (Lane B) — no API call needed.
function hasTopicOverlap(userMessage: string, contract: AnswerContract): boolean {
  const lower = userMessage.toLowerCase();
  const terms = [
    ...contract.topics_covered,
    ...contract.open_threads,
  ]
    .join(' ')
    .split(/[\s,.()\-/]+/)
    .map(t => t.toLowerCase())
    .filter(t => t.length >= 4); // ignore short stop-words

  return terms.some(t => lower.includes(t));
}

// ── Pass threshold ──────────────────────────────────────────────────────────────

// Minimum number of docs that must pass Stage 2A for the result to proceed to ANSWER.
function getPassThreshold(shortlistSize: number): number {
  if (shortlistSize <= 2) return 1;
  if (shortlistSize === 3) return 2;
  return 3; // 4–5
}

// ── Stage 2A + 2B runner ────────────────────────────────────────────────────────

// History entry shape (matches HistoryEntry in claude.ts)
interface HistoryEntry {
  role: string;
  content: string;
}

// QA log entry
interface QAEntry {
  question: string;
  answer: string;
  source: 'BASIC' | 'CLARIFY';
}

// Runs Stage 2A (verification) and, if threshold not met, Stage 2B (recovery).
// Returns the set of pages that passed verification, the CLARIFY trigger reason
// (when Stage 2B chose Decision A), and whether Stage 2B chose Decision B.
async function runStage2(
  shortlist: ManifestPage[],
  userMessage: string,
  history: HistoryEntry[],
  qaLog: QAEntry[],
  clarifyRoundCounter: number
): Promise<{
  selectedPages: ManifestPage[];
  clarifyTriggerReason: 'STAGE2B_NEEDS_CONTEXT' | null;
  decisionB: boolean;
}> {
  // Stage 2A: per-doc verification
  const stage2aResult = await verifyDocuments(
    shortlist as unknown as Page[],
    userMessage,
    qaLog,
    history
  );

  // Match verification results back to pages by docId, with index fallback
  const passingPages = shortlist.filter((page, i) => {
    const result = stage2aResult.results.find(r => r.docId === page.id)
      ?? stage2aResult.results[i];
    return result?.passes === true;
  });

  const threshold = getPassThreshold(shortlist.length);

  if (passingPages.length >= threshold) {
    console.log(`[STAGE 2A] ${passingPages.length}/${shortlist.length} docs passed verification → ANSWER`);
    return { selectedPages: passingPages, clarifyTriggerReason: null, decisionB: false };
  }

  // Stage 2B: routing recovery
  console.log(`[STAGE 2A] ${passingPages.length}/${shortlist.length} passed (threshold ${threshold}) → Stage 2B`);

  if (clarifyRoundCounter >= MAX_CLARIFY_ROUNDS) {
    console.log(`[STAGE 2B] clarifyRoundCounter=${clarifyRoundCounter} >= MAX_CLARIFY_ROUNDS=${MAX_CLARIFY_ROUNDS} → forced Decision B`);
    return { selectedPages: [], clarifyTriggerReason: null, decisionB: true };
  }

  const stage2bResult = await recoverRouting(
    shortlist as unknown as Page[],
    userMessage,
    qaLog,
    history,
    stage2aResult.results,
    clarifyRoundCounter
  );

  if (stage2bResult.decision === 'A') {
    console.log(`[STAGE 2B] Decision A — ${stage2bResult.reason}`);
    return { selectedPages: [], clarifyTriggerReason: 'STAGE2B_NEEDS_CONTEXT', decisionB: false };
  } else {
    console.log(`[STAGE 2B] Decision B — ${stage2bResult.reason}`);
    return { selectedPages: [], clarifyTriggerReason: null, decisionB: true };
  }
}

// ── File loading ───────────────────────────────────────────────────────────────

// Given an array of page objects, reads each file and returns contents as strings.
async function loadKnowledgeFiles(pages: ManifestPage[]): Promise<string[]> {
  const results = await Promise.all(
    pages.map(async (page) => {
      try {
        return await readFile(join(ROOT, page.path), 'utf-8');
      } catch (err) {
        console.warn(`[agent] could not load ${page.path}: ${(err as Error).message}`);
        return null;
      }
    })
  );
  return results.filter((r): r is string => r !== null);
}

// ── Skip-routing detection ──────────────────────────────────────────────────────

// Shape of the session context passed from session.ts
export interface SessionContext {
  language: string | null;
  tools: string[];
  setupType: string | null;
  lastLoadedDocIds: string[];
  frustrationCounter: number;
  clarifyRoundCounter: number;
  previousQuestion: string | null;
  clarificationBundles: ClarificationBundle[];
  originalQuestion?: string | null;
  qaLog: QAEntry[];
  // Post-answer state (mirrors session.ts SessionContext)
  postAnswerMode: boolean;
  postAnswerSignal: 'COMPLETE' | 'PARTIAL' | null;
  answerContract: AnswerContract | null;
  qaLogSnapshot: QAEntry[];
  postAnswerClarifyUsed: boolean;
}

// Returns true when routing should be skipped for this message.
// Exported for testing.
export function shouldSkipRouting(userMessage: string, sessionContext: SessionContext, isFirstMessage: boolean = false): boolean {
  // Never skip on the first message of a session
  if (isFirstMessage) return false;

  const trimmed = userMessage.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Pure greeting or ack — skip routing only if we have docs to reuse
  if (SKIP_ROUTING_GREETINGS.has(trimmed)) {
    return sessionContext.lastLoadedDocIds.length > 0;
  }

  // Only skip if: Mewsie just asked a clarifying question AND the user gave a
  // very short reply (≤ 4 words) AND we have docs from the previous turn to reuse.
  const prevQ = sessionContext.previousQuestion;
  const hasDocsToReuse = sessionContext.lastLoadedDocIds.length > 0;
  if (prevQ && hasDocsToReuse && wordCount <= 4 && !userMessage.includes('?')) {
    return true;
  }

  return false;
}

// ── Mode type ──────────────────────────────────────────────────────────────────

export type RoutingMode = 'ANSWER' | 'CLARIFY' | 'BASIC';

// ── Context extraction helpers ──────────────────────────────────────────────────

function extractPreviousQuestion(response: string): string | null {
  if (!response || !response.includes('?')) return null;
  const sentences = response.split(/(?<=[.!?])\s+/);
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].includes('?')) {
      return sentences[i].trim();
    }
  }
  return null;
}

const FRUSTRATION_SIGNALS = [
  "doesn't work", "not working", "still broken", "same issue", "again",
  "useless", "terrible", "wrong answer", "that's wrong", "human",
  "real person", "live agent", "support ticket",
];

function detectFrustration(message: string): boolean {
  const lower = message.toLowerCase();
  return FRUSTRATION_SIGNALS.some(signal => lower.includes(signal));
}

const TOOL_NAMES = [
  'Xero', 'Exact Online', 'DATEV', 'Afas', 'QuickBooks', 'Sage',
  'Netsuite', 'Dynamics',
];

function detectTools(message: string): string[] {
  const found: string[] = [];
  for (const tool of TOOL_NAMES) {
    if (new RegExp(tool, 'i').test(message)) {
      found.push(tool);
    }
  }
  return found;
}

const SETUP_TYPES = ['Consumed', 'Closed', 'Hybrid'];

function detectSetupType(text: string): string | null {
  for (const type of SETUP_TYPES) {
    if (new RegExp(type, 'i').test(text)) {
      return type;
    }
  }
  return null;
}

// ── Clarify answer parser ──────────────────────────────────────────────────────
//
// The frontend sends all answered clarifying questions as a single message in the format:
//   Q: [question text]\nA: [answer text]\nQ: ...\nA: ...
// This function parses that format into Q&A pairs.
// Returns empty array if the message doesn't match the format.

export function parseClarifyAnswers(message: string): { q: string; a: string }[] {
  const lines = message.split('\n').map(l => l.trim()).filter(Boolean);
  const pairs: { q: string; a: string }[] = [];
  let currentQ: string | null = null;
  for (const line of lines) {
    if (line.startsWith('Q: ')) {
      currentQ = line.slice(3).trim();
    } else if (line.startsWith('A: ') && currentQ !== null) {
      pairs.push({ q: currentQ, a: line.slice(3).trim() });
      currentQ = null;
    }
  }
  return pairs;
}

// ── Main pipeline ───────────────────────────────────────────────────────────────

// Called by server.ts for every incoming chat message.
// Runs the full pipeline and returns the final reply string.
export async function handleMessage(sessionId: string, userMessage: string): Promise<string> {
  const session = getSession(sessionId);
  const context = session.context as unknown as SessionContext;
  const history = session.history;
  const isFirstMessage = history.length === 0;

  console.log(`[SESSION]  history=${history.length} turns, isFirst=${isFirstMessage}`);

  // Step 1: Load the manifest
  let manifest: Manifest = { categories: [], files: [] };
  try {
    manifest = loadManifest();
  } catch (err) {
    console.error(`[agent] could not load manifest: ${(err as Error).message}`);
  }

  const allPages = flattenManifest(manifest);

  // ── Post-answer routing gate ────────────────────────────────────────────────
  //
  // Fires before Stage 1 when the previous turn was a successful ANSWER.
  // Stage 2B (recoverRouting) never runs in this gate — the blockade is implicit
  // because both paths that stay in docs return early before Stage 1 executes.
  //
  // PARTIAL  → same docs, Sonnet continues the answer
  // COMPLETE + topic overlap → Lane A: same docs, Sonnet goes deeper
  // COMPLETE + no overlap   → Lane B: clear state, fall through to Stage 1
  if (context.postAnswerMode && context.lastLoadedDocIds.length > 0) {
    const isPartial = context.postAnswerSignal === 'PARTIAL';
    const hasContract = context.answerContract !== null;
    const overlap = hasContract
      ? hasTopicOverlap(userMessage, context.answerContract!)
      : false;
    const stayInDocs = isPartial || (context.postAnswerSignal === 'COMPLETE' && overlap);

    if (!stayInDocs) {
      // Lane B: new unrelated question — clear post-answer state, let Stage 1 run
      console.log('[POST-ANSWER] COMPLETE + no overlap → Lane B (full reset, Stage 1)');
      updateContext(sessionId, {
        postAnswerMode: false,
        postAnswerSignal: null,
        answerContract: null,
        qaLogSnapshot: [],
        postAnswerClarifyUsed: false,
      });
      // falls through to normal pipeline below
    } else {
      // PARTIAL or Lane A: reload same docs, go straight to Sonnet
      console.log(`[POST-ANSWER] ${isPartial ? 'PARTIAL' : 'COMPLETE + overlap → Lane A'} — reusing docs, skipping routing`);

      const cachedPages = allPages.filter(p => context.lastLoadedDocIds.includes(p.id));
      const cachedContents = await loadKnowledgeFiles(cachedPages);
      const cachedKnowledge = cachedContents.length > 0 ? cachedContents.join('\n\n---\n\n') : null;

      const cachedQA = (context.qaLogSnapshot ?? []).map(e => ({ q: e.question, a: e.answer }));
      const postAnswerQueryContext: QueryContext = {
        originalQuestion: context.originalQuestion || userMessage,
        clarifyingQA: cachedQA.length > 0 ? cachedQA : undefined,
        selectedFiles: cachedPages.map(p => p.label),
        answerContract: context.answerContract ?? undefined,
      };

      const postChatResult = await chat(
        sessionId,
        userMessage,
        cachedKnowledge,
        context as unknown as Parameters<typeof chat>[3],
        postAnswerQueryContext
      );
      let postReply = postChatResult.reply;
      const postSignal = postChatResult.signal;
      const postContract = postChatResult.contract;

      // Lane A clarify budget: if Sonnet responded with buttons, check whether
      // the budget allows it (POST_ANSWER_CLARIFY_BUDGET). On budget exhaustion,
      // replace with BASIC carousel and exit post-answer mode.
      if (!isPartial && postReply.includes('[BUTTONS:]')) {
        if (!context.postAnswerClarifyUsed) {
          console.log(`[POST-ANSWER] Lane A — clarify question used (budget: ${POST_ANSWER_CLARIFY_BUDGET})`);
          updateContext(sessionId, { postAnswerClarifyUsed: true });
        } else {
          console.log('[POST-ANSWER] Lane A — clarify budget exhausted → BASIC carousel');
          const qaForBasic = (context.qaLogSnapshot ?? []).map(e => ({ q: e.question, a: e.answer }));
          postReply = await generateClarifyingQuestions(userMessage, null, qaForBasic);
          updateContext(sessionId, {
            postAnswerMode: false,
            postAnswerSignal: null,
            answerContract: null,
            qaLogSnapshot: [],
            postAnswerClarifyUsed: false,
          });
        }
      }

      // Update post-answer state based on new signal
      if (postSignal !== 'PARTIAL') {
        updateContext(sessionId, {
          postAnswerMode: false,
          postAnswerSignal: null,
          answerContract: null,
          qaLogSnapshot: [],
          clarifyRoundCounter: 0,
          originalQuestion: null,
          qaLog: [],
        });
      } else {
        updateContext(sessionId, {
          postAnswerSignal: postSignal,
          answerContract: postContract,
        });
      }

      // Common session tail updates (run even on early return)
      const postPrevQ = postReply.trimStart().startsWith('{') ? null : extractPreviousQuestion(postReply);
      updateContext(sessionId, { previousQuestion: postPrevQ });
      if (detectFrustration(userMessage)) {
        updateContext(sessionId, { frustrationCounter: (context.frustrationCounter || 0) + 1 });
      }
      const postTools = detectTools(userMessage);
      if (postTools.length > 0) {
        updateContext(sessionId, { tools: [...new Set([...(context.tools || []), ...postTools])] });
      }
      if (!context.setupType) {
        const st = detectSetupType(userMessage) || detectSetupType(postReply);
        if (st) updateContext(sessionId, { setupType: st });
      }

      console.log(`[REPLY]    ${postReply.split(/\s+/).filter(Boolean).length} words sent to user (post-answer)`);
      return postReply;
    }
  }

  // ── Pre-routing context ──────────────────────────────────────────────────────
  // Parse Q&A answers before routing.
  const incomingQAPairs = parseClarifyAnswers(userMessage);

  // Build the enriched query for Stage 1: user message + all accumulated Q&A answers.
  // This gives Stage 1 richer signal on re-runs after BASIC or CLARIFY rounds.
  const currentQALog: QAEntry[] = context.qaLog ?? [];
  const qaAnswerText = currentQALog.length > 0
    ? ' ' + currentQALog.map(e => e.answer).join(' ')
    : '';

  // When re-routing on a Q&A answer batch, use the stored original question
  // (not the "Q: ...\nA: ..." formatted string) as the base for Stage 1 scoring.
  const routingBaseMessage = incomingQAPairs.length > 0 && context.originalQuestion
    ? context.originalQuestion
    : userMessage;

  // Stage 1 query = base message + all accumulated Q&A answers
  const stage1Query = (routingBaseMessage + qaAnswerText).trim();

  // Step 2: Routing
  let selectedPages: ManifestPage[] = [];
  let clarifyTriggerReason: 'DIVERSE_TOPICS' | 'THEME_OVERFLOW' | 'TOO_BROAD' | 'STAGE2B_NEEDS_CONTEXT' | null = null;
  let clarifyMatchedMeta: { title: string; theme: string }[] = [];
  let stage2bDecisionB = false;

  const skipRouting = shouldSkipRouting(userMessage, context, isFirstMessage);

  if (skipRouting && context.lastLoadedDocIds.length > 0) {
    selectedPages = allPages.filter(p => context.lastLoadedDocIds.includes(p.id));
    console.log(`[STAGE 1]  Skipped — short follow-up, reusing previous docs`);
  } else if (allPages.length > 0) {
    try {
      // Stage 1: score all docs with deduplicated keyword+synonym matching
      const scored = keywordPreFilterScored(allPages, stage1Query);
      const matchedDocCount = scored.length;

      if (matchedDocCount === 0) {
        // Gate 1: 0 matched → BASIC
        console.log(`[STAGE 1]  0/${allPages.length} docs matched → BASIC`);

      } else if (matchedDocCount <= STAGE2A_SHORTLIST_MAX) {
        // Gate 2: 1–SHORTLIST_MAX matched → Stage 2A always.
        // Theme diversity is irrelevant here — Stage 2A evaluates each doc independently.
        // A question matching docs across different topic areas is still a specific question.
        const shortlist = scored.map(s => s.page);
        console.log(`[STAGE 1]  ${matchedDocCount}/${allPages.length} docs matched → Stage 2A`);

        let conversationHistory: HistoryEntry[] = [];
        if (ROUTER_HISTORY_ENABLED && history.length > 0) {
          conversationHistory = history.slice(-(ROUTER_HISTORY_PAIRS * 2)) as HistoryEntry[];
        }

        const stage2Result = await runStage2(
          shortlist,
          routingBaseMessage,
          conversationHistory,
          currentQALog,
          context.clarifyRoundCounter ?? 0
        );

        selectedPages = stage2Result.selectedPages;
        clarifyTriggerReason = stage2Result.clarifyTriggerReason;
        stage2bDecisionB = stage2Result.decisionB;

      } else {
        // 6+ docs matched
        const allMatched = scored.map(s => s.page);
        const { themes, dominantTheme } = computeThematicCoherence(allMatched);

        if (themes.length === 1) {
          // Gate 4: 6+ matched, all one theme → CLARIFY(THEME_OVERFLOW)
          console.log(`[STAGE 1]  ${matchedDocCount}/${allPages.length} docs matched, all theme: "${dominantTheme}" → CLARIFY(THEME_OVERFLOW)`);
          clarifyTriggerReason = 'THEME_OVERFLOW';
          clarifyMatchedMeta = allMatched.slice(0, 10).map(d => ({ title: d.label, theme: d.theme }));
        } else {
          // Gate 5: 6+ matched, multiple themes → CLARIFY(TOO_BROAD)
          console.log(`[STAGE 1]  ${matchedDocCount}/${allPages.length} docs matched, themes: [${themes.join(', ')}] → CLARIFY(TOO_BROAD)`);
          clarifyTriggerReason = 'TOO_BROAD';
          clarifyMatchedMeta = scored.slice(0, 10).map(s => ({ title: s.page.label, theme: s.page.theme }));
        }
      }
    } catch (err) {
      console.error(`[agent] routing failed: ${(err as Error).message}`);
    }
  }

  // Step 3: Determine mode
  let finalMode: RoutingMode;
  if (clarifyTriggerReason !== null) {
    finalMode = 'CLARIFY';
  } else if (stage2bDecisionB) {
    finalMode = 'BASIC';
  } else if (selectedPages.length > 0) {
    finalMode = 'ANSWER';
  } else {
    finalMode = 'BASIC';
  }

  console.log(`[MODE]     ${finalMode}`);

  // Step 4: Build reply

  let reply: string;
  let knowledgeContent: string | null = BASIC_MODE;
  let queryContext: QueryContext | null = null;
  let answerSignal: import('./claude.ts').AnswerSignal | null = null;
  let answerContract: AnswerContract | null = null;

  if (finalMode === 'ANSWER') {
    // Load full content of passing docs only
    const capped = selectedPages.slice(0, ROUTER_MAX_DOCS);
    const contents = await loadKnowledgeFiles(capped);

    if (contents.length > 0) {
      knowledgeContent = contents.join('\n\n---\n\n');
    } else {
      // Docs exist but couldn't be read — answer from base knowledge
      knowledgeContent = null;
    }

    // Build qaLog as clarifyingQA for Sonnet's queryContext
    const clarifyingQA = currentQALog.map(e => ({ q: e.question, a: e.answer }));

    queryContext = {
      originalQuestion: context.originalQuestion || userMessage,
      clarifyingQA: clarifyingQA.length > 0 ? clarifyingQA : undefined,
      selectedFiles: capped.map(p => p.label),
    };

    console.log(`[ANSWER]   ${capped.length} doc(s) loaded`);
    const chatResult = await chat(sessionId, userMessage, knowledgeContent, context as unknown as Parameters<typeof chat>[3], queryContext);
    reply = chatResult.reply;
    answerSignal = chatResult.signal;
    answerContract = chatResult.contract;

  } else if (finalMode === 'CLARIFY') {
    // Generate targeted question based on trigger reason
    const clarifyResult = await generateClarifyQuestion(
      userMessage,
      clarifyTriggerReason!,
      clarifyMatchedMeta,
      currentQALog,
      { tools: context.tools, setupType: context.setupType }
    );

    if (clarifyResult) {
      reply = `${clarifyResult.question}\n\n[BUTTONS:]\n${clarifyResult.options.map(o => `- ${o}`).join('\n')}`;
    } else {
      reply = STATIC_CLARIFY_REPLY;
      console.log('[CLARIFY]  Fell back to static reply (generateClarifyQuestion returned null)');
    }

    addToHistory(sessionId, 'user', userMessage);
    addToHistory(sessionId, 'assistant', reply);

    if (!context.originalQuestion) {
      updateContext(sessionId, { originalQuestion: userMessage });
    }

    // Increment clarifyRoundCounter only for Stage 2B Decision A (not Stage 1 gates).
    // Stage 1 gates are free — the counter tracks only the costly "we tried routing but
    // couldn't find good docs" recovery cycles.
    if (clarifyTriggerReason === 'STAGE2B_NEEDS_CONTEXT') {
      updateContext(sessionId, { clarifyRoundCounter: (context.clarifyRoundCounter ?? 0) + 1 });
    }

  } else {
    // BASIC mode — generate the 3-question card carousel via Haiku.
    // Also fires when Stage 2B chose Decision B (redirect to a fresh carousel).
    const clarifyingQA = currentQALog.map(e => ({ q: e.question, a: e.answer }));
    reply = await generateClarifyingQuestions(userMessage, null, clarifyingQA);

    addToHistory(sessionId, 'user', userMessage);
    addToHistory(sessionId, 'assistant', reply);

    if (!context.originalQuestion) {
      updateContext(sessionId, { originalQuestion: userMessage });
    }
  }

  console.log(`[REPLY]    ${reply.split(/\s+/).filter(Boolean).length} words sent to user`);

  // Step 5: Update session context

  // Track which docs were loaded (only in ANSWER mode)
  const loadedDocIds = finalMode === 'ANSWER' ? selectedPages.map(p => p.id) : [];
  updateContext(sessionId, { lastLoadedDocIds: loadedDocIds });

  if (finalMode === 'ANSWER') {
    // Snapshot the qaLog before potentially clearing it (Lane A needs this for future turns).
    updateContext(sessionId, { qaLogSnapshot: [...currentQALog] });

    if (answerSignal !== 'PARTIAL') {
      // COMPLETE or no signal — full reset of clarification state.
      updateContext(sessionId, {
        clarifyRoundCounter: 0,
        originalQuestion: null,
        qaLog: [],
      });
    }
    // Always enter post-answer mode so the next message goes through the gate.
    updateContext(sessionId, {
      postAnswerMode: true,
      postAnswerSignal: answerSignal,
      answerContract: answerContract,
      postAnswerClarifyUsed: false,
    });
  } else {
    // CLARIFY or BASIC — append incoming Q&A to qaLog for future Stage 1 re-runs.
    if (incomingQAPairs.length > 0) {
      const source = (finalMode === 'CLARIFY' ? 'CLARIFY' : 'BASIC') as 'BASIC' | 'CLARIFY';
      const newEntries: QAEntry[] = incomingQAPairs.map(p => ({
        question: p.q,
        answer: p.a,
        source,
      }));
      updateContext(sessionId, { qaLog: [...currentQALog, ...newEntries] });
    }
  }

  // Don't extract a "previous question" from JSON (clarify card replies).
  const previousQuestion = reply.trimStart().startsWith('{') ? null : extractPreviousQuestion(reply);
  updateContext(sessionId, { previousQuestion });

  if (detectFrustration(userMessage)) {
    const newCount = (context.frustrationCounter || 0) + 1;
    updateContext(sessionId, { frustrationCounter: newCount });
    console.log(`[agent] frustration counter: ${newCount}`);
  }

  const detectedTools = detectTools(userMessage);
  if (detectedTools.length > 0) {
    const existingTools = context.tools || [];
    const mergedTools = [...new Set([...existingTools, ...detectedTools])];
    updateContext(sessionId, { tools: mergedTools });
  }

  if (!context.setupType) {
    const setupType = detectSetupType(userMessage) || detectSetupType(reply);
    if (setupType) {
      updateContext(sessionId, { setupType });
    }
  }

  return reply;
}
