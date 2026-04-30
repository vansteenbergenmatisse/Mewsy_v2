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
  generateSmartClarifyQuestion,
  generateSmartBasicQuestion,
  generateClarifyingQuestions,
  generateIntroLine,
  ANSWER_MODEL,
  PROMPT_VERSION_HASH,
} from './claude.ts';
import type { QueryContext, Page, AnswerContract } from './claude.ts';
import {
  getSession,
  updateContext,
} from './session.ts';
import { recordTurn } from '../memory/session-memory.ts';
import type { SessionContext } from './session.ts';
import {
  ROUTER_MAX_DOCS,
  ROUTER_HISTORY_ENABLED,
  ROUTER_HISTORY_PAIRS,
  MAX_CLARIFY_ROUNDS,
  STAGE2A_SHORTLIST_MAX,
  POST_ANSWER_CLARIFY_BUDGET,
  FUZZY_MATCH_ENABLED,
  ENABLE_DB_WRITES,
  FRUSTRATION_THRESHOLD,
} from '../config/mewsie.config.ts';
import type { Manifest } from '../types/manifest.ts';
import { migrateManifest } from '../scraper/pipeline/manifest.ts';
import { TurnBuffer } from '../db/turn-buffer.ts';
import { resolveIdentity, updateUserAccountingSystem } from '../db/identity.ts';

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
//
// Button labels stay in English on purpose: Stage 1 keyword matching is
// English-only and translated labels would break the click-to-route loop.
// Only the question prefix is translated.
const STATIC_CLARIFY_PREFIX: Record<string, string> = {
  en: "Could you give me a bit more context about what you're looking for?",
  de: 'Kannst du mir etwas mehr Kontext dazu geben, wonach du suchst?',
  fr: 'Pouvez-vous me donner un peu plus de contexte sur ce que vous cherchez ?',
  nl: 'Kun je me wat meer context geven over wat je zoekt?',
};

// Short-token clarify prefix (e.g. "qb" → "Did you mean QuickBooks?").
const SHORT_TOKEN_CLARIFY_PREFIX: Record<string, string> = {
  en: "Could you clarify what you're looking for?",
  de: 'Kannst du kurz präzisieren, wonach du suchst?',
  fr: 'Pouvez-vous préciser ce que vous cherchez ?',
  nl: 'Kun je kort verduidelijken wat je zoekt?',
};

function translate(map: Record<string, string>, lang: string | null): string {
  const l = lang || 'en';
  return map[l] || map[l.split('-')[0]] || map.en;
}

function staticClarifyReply(lang: string | null): string {
  return (
    `${translate(STATIC_CLARIFY_PREFIX, lang)} ` +
    `[BUTTONS: Onboarding / getting started | Accounting integration setup | ` +
    `GL mapping and reporting | Troubleshooting an issue | Something else]`
  );
}

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

// ── Damerau-Levenshtein edit distance ──────────────────────────────────────────
//
// Counts the minimum number of single-character edits (insert, delete, substitute,
// or adjacent transposition) needed to transform string `a` into string `b`.
// Transpositions (e.g. "quicbkook" → "quickbook") count as 1 edit, not 2.
// Used by fuzzy keyword matching and short-token candidate detection.

function damerauLevenshtein(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  // dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
  const dp: number[][] = Array.from({ length: la + 1 }, (_, i) =>
    Array.from({ length: lb + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,           // deletion
        dp[i][j - 1] + 1,           // insertion
        dp[i - 1][j - 1] + cost     // substitution
      );
      // Adjacent transposition (Damerau extension)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost);
      }
    }
  }
  return dp[la][lb];
}

// ── Short-token candidate detection ────────────────────────────────────────────
//
// When the Stage 1 keyword filter returns 0 matches AND the message contains tokens
// that are < 5 chars, try to find keyword matches via prefix matching (for 2–4 char
// tokens) rather than silently falling through to the generic BASIC carousel.
//
// Returns up to 3 candidate keyword display strings (e.g. ["QuickBooks", "Sage"])
// so the pipeline can ask "Did you mean X, Y, or Z?" instead.
//
// Common English stop words are excluded so "in", "for", "the" don't trigger this.

const SHORT_STOPWORDS = new Set([
  'i', 'a', 'an', 'the', 'in', 'on', 'at', 'to', 'do', 'is', 'it',
  'be', 'of', 'my', 'me', 'we', 'no', 'yes', 'ok', 'hi', 'hey',
  'how', 'why', 'can', 'for', 'or', 'if', 'not', 'but', 'and',
  'get', 'set', 'use', 'new', 'old', 'all', 'any', 'its',
  'are', 'was', 'has', 'had', 'did', 'got', 'put', 'try',
  'help', 'need', 'want', 'know', 'have', 'find', 'show', 'tell',
  'more', 'less', 'also', 'just', 'only', 'even', 'then', 'than',
  'some', 'with', 'from', 'that', 'this', 'what', 'when', 'who',
]);

export function findShortTokenCandidates(msgTokens: string[], pages: ManifestPage[]): string[] {
  const shortTokens = msgTokens.filter(t => t.length >= 2 && t.length < 5 && !SHORT_STOPWORDS.has(t));
  if (shortTokens.length === 0) return [];

  // Collect all unique single-word keywords/synonyms (skip multi-word phrases —
  // prefix matching against "accounting software" on a 2-char token is noise).
  const singleWordKeywords = [...new Set(
    pages.flatMap(p => [...(p.keywords ?? []), ...(p.synonyms ?? [])])
      .filter(kw => !/\s/.test(kw))
  )];

  const seen = new Set<string>();
  const candidates: { keyword: string; dist: number }[] = [];

  for (const token of shortTokens) {
    for (const kw of singleWordKeywords) {
      const kwLower = kw.toLowerCase();
      if (seen.has(kwLower)) continue;

      // Primary: prefix match — token is a prefix of the keyword
      // e.g. "xer" → "xero", "sag" → "sage", "dat" → "datev"
      if (kwLower.startsWith(token)) {
        seen.add(kwLower);
        candidates.push({ keyword: kw, dist: 0 });
      }
    }
  }

  // Return top 3 unique candidates, shortest edit distance first, then alphabetically
  return candidates
    .sort((a, b) => a.dist - b.dist || a.keyword.localeCompare(b.keyword))
    .slice(0, 3)
    .map(c => c.keyword);
}

// ── CLARIFY button selection ────────────────────────────────────────────────────
//
// Picks up to 4 keyword labels from matched docs to show as CLARIFY buttons.
// Uses manifest keywords directly — correctly capitalised, no stripping needed.
//
// For THEME_OVERFLOW (6+ docs, single theme): removes keywords shared by ALL matched
// docs (non-discriminating like "QuickBooks" or "Mews") then picks from unique ones.
// For other reasons: picks highest-frequency keywords across matched docs.
//
// Filters out keywords already present in previousAnswers to prevent repeat buttons.

export function pickClarifyButtons(
  matchedDocs: ManifestPage[],
  triggerReason: string,
  previousAnswers: string[],
  allPages: ManifestPage[] = []
): string[] {
  const prevLower = new Set(previousAnswers.map(a => a.toLowerCase()));
  const allKws = matchedDocs.flatMap(d => d.keywords ?? []);

  const freq = new Map<string, number>();
  for (const kw of allKws) freq.set(kw, (freq.get(kw) ?? 0) + 1);

  // Build global keyword frequency to identify overly broad terms.
  // Keywords present in >15% of ALL docs (e.g. "Omniboost", "MEWS") appear in so many
  // docs that selecting them as a CLARIFY answer expands Stage 1 matches instead of
  // narrowing them, causing an infinite CLARIFY loop.
  const globalFreq = new Map<string, number>();
  for (const page of allPages) {
    const pageSeen = new Set<string>();
    for (const kw of page.keywords ?? []) {
      if (!pageSeen.has(kw)) { globalFreq.set(kw, (globalFreq.get(kw) ?? 0) + 1); pageSeen.add(kw); }
    }
  }
  const globalCap = allPages.length > 0 ? Math.ceil(allPages.length * 0.15) : Infinity;

  // THEME_OVERFLOW: also strip keywords shared by ALL matched docs (non-discriminating)
  const n = matchedDocs.length;
  const localPool: string[] = triggerReason === 'THEME_OVERFLOW'
    ? [...freq.entries()].filter(([, c]) => c < n).map(([kw]) => kw)
    : [...freq.keys()];

  // Remove globally common keywords — only specific terms make useful buttons
  const pool = localPool.filter(kw => (globalFreq.get(kw) ?? 0) <= globalCap);

  const seen = new Set<string>();
  const result: string[] = [];
  // Three-tier sort:
  //   Tier 0 — proper nouns (start with uppercase): integration names, system names, acronyms
  //   Tier 1 — single-word generic terms
  //   Tier 2 — multi-word all-lowercase phrases (e.g. "accounting software", "supported systems")
  // Within each tier, sort by local freq ASC (fewer occurrences = more specific = preferred).
  const isProper = (kw: string) => /^[A-Z]/.test(kw);
  const isMultiWordGeneric = (kw: string) => /\s/.test(kw) && !/^[A-Z]/.test(kw);
  pool.sort((a, b) => {
    const tierA = isProper(a) ? 0 : isMultiWordGeneric(a) ? 2 : 1;
    const tierB = isProper(b) ? 0 : isMultiWordGeneric(b) ? 2 : 1;
    if (tierA !== tierB) return tierA - tierB;
    return (freq.get(a) ?? 0) - (freq.get(b) ?? 0);
  });
  for (const kw of pool) {
    const lower = kw.toLowerCase();
    if (seen.has(lower) || prevLower.has(lower)) continue;
    seen.add(lower);
    result.push(kw);
    if (result.length === 4) break;
  }
  return result;
}

// ── Context-aware BASIC button scan ────────────────────────────────────────────
//
// Before showing generic category buttons in BASIC mode, scans the user's message
// for any recognizable manifest keyword (exact or 1-edit fuzzy). If found, those
// keywords are prepended to the generic category buttons so the response is
// relevant to what the user actually mentioned.
//
// Returns up to 3 specific keyword strings, or [] if nothing recognizable was found.

export function basicContextButtons(
  userMessage: string,
  allPages: ManifestPage[]
): string[] {
  const msgTokens = userMessage.toLowerCase().split(/[\s,.()\-/]+/).filter(Boolean);
  // Only single-word keywords — multi-word phrases don't scan cleanly against tokens
  const allKeywords = [...new Set(
    allPages.flatMap(p => (p.keywords ?? []).filter(kw => !/\s/.test(kw)))
  )];

  const matched: string[] = [];
  const seen = new Set<string>();

  for (const kw of allKeywords) {
    const kwLower = kw.toLowerCase();
    if (seen.has(kwLower) || kwLower.length < 3) continue;
    const isMatch = msgTokens.some(t =>
      // Substring: token must be ≥ 4 chars to avoid "in" matching "integrations" etc.
      (t.length >= 4 && kwLower.includes(t)) ||
      // Fuzzy: token must be ≥ 4 chars and keyword ≥ 5 chars, max 1 edit
      (kwLower.length >= 5 && t.length >= 4 && damerauLevenshtein(t, kwLower) <= 1)
    );
    if (isMatch) {
      matched.push(kw);
      seen.add(kwLower);
    }
    if (matched.length === 3) break;
  }
  return matched;
}

// ── Trigger-question scoring helpers ────────────────────────────────────────────

const STOP_WORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being',
  'have','has','had','do','does','did','will','would','could','should',
  'can','shall','to','of','in','for','on','with','at','by','from','as',
  'about','what','which','who','how','when','where','why','that','this',
  'it','i','you','he','she','we','they','me','my','your','and','or',
  'but','not','no','if','so','than','too','very','just','also',
]);

function contentTokens(text: string): string[] {
  return text.toLowerCase().split(/[\s,.()\-/'"?!]+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

// ── Keyword pre-filter ──────────────────────────────────────────────────────────

// Zero-LLM pre-filter: scores each doc by how many of its unique keywords + synonyms
// appear in the user message (substring match + optional fuzzy match, case-insensitive,
// deduplicated). Returns only matched docs, ranked by overlap count. No fallback, no cap.
// Exported for unit testing.
export function keywordPreFilter(pages: ManifestPage[], userMessage: string): ManifestPage[] {
  return keywordPreFilterScored(pages, userMessage).map(s => s.page);
}

// Scored version — returns hit counts needed for gate logic. Exported for testing.
export function keywordPreFilterScored(
  pages: ManifestPage[],
  userMessage: string
): { page: ManifestPage; hits: number }[] {
  const msgLower = userMessage.toLowerCase();
  // Tokenise for fuzzy matching — only used when FUZZY_MATCH_ENABLED is true.
  const msgTokens = msgLower.split(/[\s,.()\-/]+/).filter(t => t.length >= 3);

  return pages
    .map(page => {
      // Deduplicate keywords + synonyms so a repeated term never inflates the score.
      const terms = [...new Set([...(page.keywords ?? []), ...(page.synonyms ?? [])])];
      const hits = terms.filter(t => {
        const k = t.toLowerCase();

        // Fast path: exact substring match (case-insensitive)
        if (msgLower.includes(k)) return true;

        // Fuzzy path: Damerau-Levenshtein for keywords ≥ 5 chars.
        // Short keywords (< 5 chars, e.g. "GL", "POS", "VAT") are excluded —
        // 1–2 edits on a 3–4 char string would produce too many false positives.
        // Thresholds: 5–6 char keywords → 1 edit; 7+ char keywords → 2 edits.
        // 2 edits is necessary for common transposition+insertion typos like
        // "quicbkook" → "quickbooks" (adjacent swap + missing trailing char).
        if (!FUZZY_MATCH_ENABLED || k.length < 5) return false;
        const maxEdits = k.length <= 6 ? 1 : 2;
        return msgTokens.some(w => damerauLevenshtein(w, k) <= maxEdits);
      }).length;

      // Trigger-question bonus: bidirectional content-word overlap between the
      // user message and each trigger_question. Both directions must pass:
      //   trigger→user: ≥75% of trigger's content words appear in user message
      //   user→trigger: ≥50% of user's content words appear in trigger
      // The bidirectional check prevents short triggers (e.g. 1 content word)
      // from matching long unrelated queries just because they share one term.
      const TRIGGER_THRESHOLD_TU = 0.75;  // trigger→user direction
      const TRIGGER_THRESHOLD_UT = 0.50;  // user→trigger direction
      let triggerBonus = 0;
      if (page.trigger_questions?.length) {
        const userTokens = contentTokens(userMessage);
        for (const tq of page.trigger_questions) {
          const tqTokens = contentTokens(tq);
          if (tqTokens.length === 0) continue;
          // trigger→user: how much of the trigger appears in the user message
          const tuOverlap = tqTokens.filter(t => msgLower.includes(t)).length;
          if (tuOverlap / tqTokens.length < TRIGGER_THRESHOLD_TU) continue;
          // user→trigger: how much of the user message appears in the trigger
          if (userTokens.length === 0) continue;
          const tqLower = tq.toLowerCase();
          const utOverlap = userTokens.filter(t => tqLower.includes(t)).length;
          if (utOverlap / userTokens.length >= TRIGGER_THRESHOLD_UT) {
            triggerBonus = 2;
            break;
          }
        }
      }

      return { page, hits: hits + triggerBonus };
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
// Words too generic to signal real topic overlap — they appear in nearly every
// contract and in many user questions. Excluded from overlap scoring so that
// "Can you help me find information about Omniboost?" doesn't falsely match.
const OVERLAP_STOPWORDS = new Set([
  'omniboost', 'mews', 'integration', 'accounting', 'information',
  'help', 'setup', 'configuration', 'documentation', 'system',
  'hotel', 'property', 'support', 'guide', 'overview', 'connection',
]);

function hasTopicOverlap(userMessage: string, contract: AnswerContract): boolean {
  const lower = userMessage.toLowerCase();

  // Meta-follow-up short-circuit: phrases that clearly deepen or continue the
  // previous answer regardless of vocabulary overlap with the contract.
  // "step 5", "go in depth", "tell me more", etc. are always Lane A.
  const META_PATTERNS = [
    /\bgo\s+in\s+depth\b/,
    /\btell\s+me\s+more\b/,
    /\belaborate\b/,
    /\bstep\s+\d+\b/,
    /\bmore\s+detail\b/,
    /\bexplain\s+more\b/,
    /\bwhat\s+about\s+step\b/,
    /\bcan\s+you\s+expand\b/,
    /\bgo\s+deeper\b/,
  ];
  if (META_PATTERNS.some(p => p.test(lower))) return true;

  const terms = [
    ...contract.topics_covered,
    ...contract.open_threads,
  ]
    .join(' ')
    .split(/[\s,.()\-/]+/)
    .map(t => t.toLowerCase())
    .filter(t => t.length >= 4); // ignore short stop-words

  // Require at least 2 non-stopword matching terms to signal genuine overlap.
  // This prevents generic questions ("Can you help me find information?") from
  // falsely triggering Lane A due to common words like "information" or "integration".
  const matchingTerms = terms.filter(t =>
    !OVERLAP_STOPWORDS.has(t) && new RegExp(`\\b${t}\\b`).test(lower)
  );
  return matchingTerms.length >= 2;
}

// ── Pass threshold ──────────────────────────────────────────────────────────────

// Minimum number of docs that must pass Stage 2A for the result to proceed to ANSWER.
// Stage 2A now reads full doc content — a single confirmed pass is sufficient.
function getPassThreshold(_shortlistSize: number): number {
  return 1;
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
  contentVerifiedFailure: boolean;
}> {
  // Load full file contents for all shortlisted docs before Stage 2A.
  // Stage 2A reads full .md content — not just manifest metadata.
  const rawContents = await loadKnowledgeFiles(shortlist);
  const fileContents: Record<string, string> = {};
  let loadErrors = false;
  shortlist.forEach((page, i) => {
    const content = rawContents[i];
    if (content !== null) {
      fileContents[page.id] = content;
    } else {
      loadErrors = true;
    }
  });

  // Stage 2A: per-doc verification against full document content
  const stage2aResult = await verifyDocuments(
    shortlist as unknown as Page[],
    fileContents,
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
    return { selectedPages: passingPages, clarifyTriggerReason: null, decisionB: false, contentVerifiedFailure: false };
  }

  // Threshold not met — distinguish clean "no content" failures from errors.
  const hasAnyErrors = stage2aResult.hasErrors || loadErrors;

  if (!hasAnyErrors) {
    // Haiku read the full content and determined the answer isn't there.
    // Asking for clarification can't change what's in the docs — go to BASIC with apology.
    console.log(`[STAGE 2A] ${passingPages.length}/${shortlist.length} passed (threshold ${threshold}) — content verified, answer not found → BASIC`);
    return { selectedPages: [], clarifyTriggerReason: null, decisionB: false, contentVerifiedFailure: true };
  }

  // Errors occurred (file load failures, API errors) → Stage 2B error-recovery path.
  console.log(`[STAGE 2A] ${passingPages.length}/${shortlist.length} passed (threshold ${threshold}) — errors during verification → Stage 2B`);

  if (clarifyRoundCounter >= MAX_CLARIFY_ROUNDS) {
    console.log(`[STAGE 2B] clarifyRoundCounter=${clarifyRoundCounter} >= MAX_CLARIFY_ROUNDS=${MAX_CLARIFY_ROUNDS} → forced Decision B`);
    return { selectedPages: [], clarifyTriggerReason: null, decisionB: true, contentVerifiedFailure: false };
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
    return { selectedPages: [], clarifyTriggerReason: 'STAGE2B_NEEDS_CONTEXT', decisionB: false, contentVerifiedFailure: false };
  } else {
    console.log(`[STAGE 2B] Decision B — ${stage2bResult.reason}`);
    return { selectedPages: [], clarifyTriggerReason: null, decisionB: true, contentVerifiedFailure: false };
  }
}

// ── File loading ───────────────────────────────────────────────────────────────

// Given an array of page objects, reads each file and returns contents as strings.
// Returns (string | null)[] preserving index — null means the file failed to load.
async function loadKnowledgeFiles(pages: ManifestPage[]): Promise<(string | null)[]> {
  return Promise.all(
    pages.map(async (page) => {
      try {
        return await readFile(join(ROOT, page.path), 'utf-8');
      } catch (err) {
        console.warn(`[agent] could not load ${page.path}: ${(err as Error).message}`);
        return null;
      }
    })
  );
}

// ── Skip-routing detection ──────────────────────────────────────────────────────

// SessionContext is now imported from session.ts (shared type in types/session-context.ts)
export type { SessionContext } from './session.ts';

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
  // Exclude messages that start with a question word — those are new questions,
  // not short replies to a clarifying question (e.g. "what is city ledger" is 4
  // words but is a new question, not a reply like "Xero" or "the consumed flow").
  const QUESTION_STARTERS = new Set([
    'what', 'why', 'how', 'when', 'where', 'which', 'who',
    'is', 'are', 'does', 'do', 'can', 'could', 'would', 'should', 'will',
  ]);
  const firstWord = trimmed.split(/\s+/)[0];
  const startsWithQuestion = QUESTION_STARTERS.has(firstWord);
  const prevQ = sessionContext.previousQuestion;
  const hasDocsToReuse = sessionContext.lastLoadedDocIds.length > 0;
  if (prevQ && hasDocsToReuse && wordCount <= 4 && !userMessage.includes('?') && !startsWithQuestion) {
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

// ── Tier detection from user message ───────────────────────────────────────────
// Belt-and-suspenders: catches tier mentions even in CLARIFY/BASIC flows where
// Sonnet's [TIER:X] signal is not emitted. Only used when context.tier is null.
const TIER_PATTERNS: [RegExp, 'bronze' | 'silver' | 'gold'][] = [
  [/\b(bronze|free tier|free subscription|basic tier|included tier)\b/i, 'bronze'],
  [/\bsilver\b/i, 'silver'],
  [/\bgold\b/i, 'gold'],
];

export function detectTier(message: string): 'bronze' | 'silver' | 'gold' | null {
  for (const [pattern, tier] of TIER_PATTERNS) {
    if (pattern.test(message)) return tier;
  }
  return null;
}

// ── Tier-based doc content filtering ───────────────────────────────────────────
// Strips doc sections that require a higher tier than the user has.
// Markers: <!-- tier:silver+ -->...<!-- /tier --> and <!-- tier:gold -->...<!-- /tier -->
const TIER_LEVELS: Record<string, number> = { bronze: 1, silver: 2, gold: 3 };

export function stripTierContent(
  docContent: string,
  userTier: 'bronze' | 'silver' | 'gold' | null,
): string {
  // When tier is unknown, pass docs unfiltered — Sonnet will mention tier-specific parts
  if (!userTier) return docContent;

  const userLevel = TIER_LEVELS[userTier];

  return docContent.replace(
    /<!-- tier:(bronze|silver|gold)\+? -->([\s\S]*?)<!-- \/tier -->/gi,
    (_match, markerTier: string, _content: string) => {
      const requiredLevel = TIER_LEVELS[markerTier.toLowerCase()];
      if (userLevel >= requiredLevel) {
        // User has access — keep the content, strip only the markers
        return _content;
      }
      // User does not have access — replace with upgrade note
      const tierName = markerTier.charAt(0).toUpperCase() + markerTier.slice(1).toLowerCase();
      return `\n[This section requires ${tierName} tier or higher. Explore upgrade options at https://omniboost.io/mews-integration-tiers]\n`;
    },
  );
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

  // Also handle button-click format: "question text → answer text"
  // The frontend sends button selections as "[question] → [chosen option]".
  // This format is not parsed by the Q:/A: loop above.
  if (pairs.length === 0 && message.includes(' → ')) {
    const arrowIdx = message.lastIndexOf(' → ');
    const q = message.slice(0, arrowIdx).trim();
    const a = message.slice(arrowIdx + 3).trim();
    if (q && a) pairs.push({ q, a });
  }

  return pairs;
}

// ── Main pipeline ───────────────────────────────────────────────────────────────

// Called by server.ts for every incoming chat message.
// Runs the full pipeline and returns the reply + optional bundleId for feedback.
export async function handleMessage(
  sessionId: string,
  userMessage: string,
  language: string | null = null,
  browserToken: string | null = null,
  baseUserId: string | null = null
): Promise<{ reply: string; bundleId?: string; ticketOffer?: boolean }> {
  const session = getSession(sessionId);
  const context = session.context as unknown as SessionContext;
  const history = session.history;
  const isFirstMessage = history.length === 0;

  // ── Identity resolution (Supabase) ─────────────────────────────────────────
  let conversationId = 'noop';
  let userId = 'noop';
  if (ENABLE_DB_WRITES && browserToken) {
    try {
      const identity = await resolveIdentity(browserToken, sessionId, language, baseUserId);
      conversationId = identity.conversationId;
      userId = identity.userId;
    } catch (err) {
      console.error('[agent] identity resolution failed:', (err as Error).message);
    }
  }

  // ── Pre-populate context from user record (Base sync or prior sessions) ──
  if (ENABLE_DB_WRITES && isFirstMessage && userId !== 'noop') {
    try {
      const supabase = (await import('../db/supabase.ts')).getSupabase();
      const { data: userRow } = await supabase
        .from('users')
        .select('base_user_id, target_accounting_system, tier, company_name')
        .eq('id', userId)
        .single();
      if (userRow) {
        const patch: Record<string, unknown> = {};
        if (userRow.target_accounting_system && context.tools.length === 0) {
          const tools = userRow.target_accounting_system.split(',').map((s: string) => s.trim()).filter(Boolean);
          patch.tools = tools;
          context.tools = tools;
          console.log(`[BASE-SYNC] Pre-populated tools: ${tools.join(', ')}`);
        }
        if (userRow.tier && !context.tier) {
          const validTier = userRow.tier as 'bronze' | 'silver' | 'gold';
          patch.tier = validTier;
          context.tier = validTier;
          console.log(`[BASE-SYNC] Tier: ${validTier}`);
        }
        if (userRow.company_name && !context.companyName) {
          patch.companyName = userRow.company_name;
          context.companyName = userRow.company_name;
          console.log(`[BASE-SYNC] Company: ${userRow.company_name}`);
        }
        if (Object.keys(patch).length > 0) {
          updateContext(sessionId, patch);
        }
      }
    } catch (err) {
      console.error('[agent] context pre-population failed:', (err as Error).message);
    }
  }

  // ── TurnBuffer setup ───────────────────────────────────────────────────────
  const buffer = new TurnBuffer(conversationId);

  // Persist the language the frontend last reported. This is authoritative:
  // every request carries the currently-selected language, so we simply
  // overwrite whatever was stored before. This is what lets Haiku-driven
  // intro lines, CLARIFY, and BASIC replies speak the user's language.
  if (typeof language === 'string' && language.length > 0 && language !== context.language) {
    updateContext(sessionId, { language });
    context.language = language;
  }

  console.log(`[SESSION]  history=${history.length} turns, isFirst=${isFirstMessage}, lang=${context.language ?? 'null'}`);

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
      const filteredCachedContents = cachedContents
        .filter((c): c is string => c !== null)
        .map(c => stripTierContent(c, context.tier));
      const cachedKnowledge = filteredCachedContents.length > 0 ? filteredCachedContents.join('\n\n---\n\n') : null;

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
      buffer.addLlmCall({
        call_type: 'POST_ANSWER',
        model: ANSWER_MODEL,
        input_tokens: postChatResult.usage.input_tokens,
        output_tokens: postChatResult.usage.output_tokens,
        cache_creation_tokens: postChatResult.usage.cache_creation_tokens,
        cache_read_tokens: postChatResult.usage.cache_read_tokens,
        stop_reason: postChatResult.stop_reason,
        api_response_id: postChatResult.api_response_id,
        latency_ms: postChatResult.latency_ms,
        retry_count: 0,
        error_message: null,
        system_prompt_version_hash: PROMPT_VERSION_HASH,
      });
      let postReply = postChatResult.reply;
      const postSignal = postChatResult.signal;
      const postContract = postChatResult.contract;

      // Persist tier if Sonnet detected it in post-answer mode
      if (postChatResult.tier && postChatResult.tier !== context.tier) {
        updateContext(sessionId, { tier: postChatResult.tier });
        context.tier = postChatResult.tier;
        console.log(`[TIER] Tier set to: ${postChatResult.tier} (post-answer)`);
      }

      // Lane A clarify budget: if Sonnet responded with buttons, check whether
      // the budget allows it (POST_ANSWER_CLARIFY_BUDGET). On budget exhaustion,
      // replace with BASIC carousel and exit post-answer mode.
      if (!isPartial && postReply.includes('[BUTTONS:')) {
        if (!context.postAnswerClarifyUsed) {
          console.log(`[POST-ANSWER] Lane A — clarify question used (budget: ${POST_ANSWER_CLARIFY_BUDGET})`);
          updateContext(sessionId, { postAnswerClarifyUsed: true });
        } else {
          console.log('[POST-ANSWER] Lane A — clarify budget exhausted → BASIC carousel');
          const qaForBasic = (context.qaLogSnapshot ?? []).map(e => ({ q: e.question, a: e.answer }));
          postReply = generateClarifyingQuestions(userMessage, null, qaForBasic, basicContextButtons(userMessage, allPages), context.language);
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
          postAnswerClarifyUsed: false,
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
      let ticketOffer = false;
      if (detectFrustration(userMessage)) {
        const newPostFrustration = (context.frustrationCounter || 0) + 1;
        updateContext(sessionId, { frustrationCounter: newPostFrustration });
        if (newPostFrustration >= FRUSTRATION_THRESHOLD) {
          ticketOffer = true;
          console.log(`[agent] frustration threshold (${FRUSTRATION_THRESHOLD}) reached → ticket offer (post-answer)`);
        }
      }
      const postTools = detectTools(userMessage);
      if (postTools.length > 0) {
        updateContext(sessionId, { tools: [...new Set([...(context.tools || []), ...postTools])] });
      }
      if (!context.setupType) {
        const st = detectSetupType(userMessage) || detectSetupType(postReply);
        if (st) updateContext(sessionId, { setupType: st });
      }
      if (!context.tier) {
        const detectedTier = detectTier(userMessage);
        if (detectedTier) {
          updateContext(sessionId, { tier: detectedTier });
          console.log(`[TIER] Tier auto-detected from message: ${detectedTier} (post-answer)`);
        }
      }

      console.log(`[REPLY]    ${postReply.split(/\s+/).filter(Boolean).length} words sent to user (post-answer)`);

      // Flush buffer (fire-and-forget in post-answer path)
      const postBundleId = buffer.openBundle(userMessage);
      buffer.addMessage('user', userMessage);
      buffer.addMessage('bot', postReply);
      buffer.updateBundle({ routing_mode: 'POST_ANSWER' });
      buffer.flush().catch(err => console.error('[turn-buffer] flush failed:', err.message));

      return { reply: postReply, bundleId: postBundleId, ...(ticketOffer ? { ticketOffer: true } : {}) };
    }
  }

  // ── Pre-routing context ──────────────────────────────────────────────────────
  // Parse Q&A answers before routing.
  const incomingQAPairs = parseClarifyAnswers(userMessage);

  // Build answer lists for button deduplication and Stage 2A context.
  // Merge incoming Q&A pairs into the log immediately so Stage 2A sees
  // the full refined intent (e.g. "onboarding" + "Xero"), not just the
  // original question. Without this, the qaLog passed to verifyDocuments
  // is empty on the first button click, and Haiku rejects relevant docs.
  const currentQALog: QAEntry[] = [
    ...(context.qaLog ?? []),
    ...incomingQAPairs.map(p => ({ question: p.q, answer: p.a, source: 'CLARIFY' as const })),
  ];
  const allAnswers = [
    ...currentQALog.map(e => e.answer),
    ...incomingQAPairs.map(p => p.a),
  ].filter(Boolean);

  // When re-routing on a Q&A answer batch, use the stored original question
  // (not the "Q: ...\nA: ..." formatted string) as the base for Stage 1 scoring.
  const routingBaseMessage = incomingQAPairs.length > 0 && context.originalQuestion
    ? context.originalQuestion
    : userMessage;

  // Stage 1 query strategy:
  //   Button click  → use ONLY the most recent answer as the search term.
  //                   Stage 1 is OR-additive: appending all accumulated answers
  //                   monotonically expands the match set and traps the session
  //                   in CLARIFY forever. Using only the latest answer keeps the
  //                   search narrow and convergent. The full QA log is still passed
  //                   to Stage 2A, so earlier context is not lost.
  //   Free-text     → use base message only (no accumulated answers appended).
  //                   The user's own words are the best signal; the QA log is
  //                   available to Stage 2A for disambiguation.
  const lastIncomingAnswer = incomingQAPairs[incomingQAPairs.length - 1]?.a ?? '';
  const stage1Query = incomingQAPairs.length > 0
    ? lastIncomingAnswer
    : routingBaseMessage;

  // Step 2: Routing
  let selectedPages: ManifestPage[] = [];
  let clarifyTriggerReason: 'DIVERSE_TOPICS' | 'THEME_OVERFLOW' | 'TOO_BROAD' | 'STAGE2B_NEEDS_CONTEXT' | null = null;
  let clarifyMatchedMeta: { title: string; theme: string; keywords: string[] }[] = [];
  let escapeHatchDocs: ManifestPage[] = [];
  let stage2bDecisionB = false;
  let contentVerifiedFailure = false;
  let shortTokenCandidates: string[] = [];

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
        // Gate 1: 0 matched → check for short-token candidates before falling to BASIC.
        // If the message contains short tokens (2–4 chars, non-stop-word) that prefix-match
        // known keywords, surface them as a targeted CLARIFY ("Did you mean X, Y, Z?")
        // instead of showing the generic 3-question carousel.
        const msgTokensForCandidates = stage1Query.toLowerCase().split(/[\s,.()\-/]+/).filter(Boolean);
        shortTokenCandidates = findShortTokenCandidates(msgTokensForCandidates, allPages);
        if (shortTokenCandidates.length > 0) {
          clarifyTriggerReason = 'TOO_BROAD';
          console.log(`[STAGE 1]  0/${allPages.length} docs matched, short token → CLARIFY candidates: [${shortTokenCandidates.join(', ')}]`);
        } else {
          console.log(`[STAGE 1]  0/${allPages.length} docs matched → BASIC`);
        }

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
        contentVerifiedFailure = stage2Result.contentVerifiedFailure;

      } else {
        // 6+ docs matched — check for a score gap before falling to CLARIFY.
        // If the top-scored docs clearly separate from the pack (top hit count
        // is ≥ 2× the next tier's hit count), those top docs are specific enough
        // to route to Stage 2A. This prevents a single noise keyword like
        // "Omniboost" from dragging 30 irrelevant docs into the pool.
        const topHits = scored[0].hits;
        const topTier = scored.filter(s => s.hits === topHits);
        const nextTierHits = scored.find(s => s.hits < topHits)?.hits ?? 0;

        if (topHits >= 2 * nextTierHits && topTier.length <= STAGE2A_SHORTLIST_MAX) {
          // Clear score gap — top docs are meaningfully more relevant
          const shortlist = topTier.map(s => s.page);
          console.log(`[STAGE 1]  ${matchedDocCount} docs matched, score gap ${topHits}→${nextTierHits} — top ${topTier.length} to Stage 2A`);

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
          contentVerifiedFailure = stage2Result.contentVerifiedFailure;

        } else {
          // No clear score gap — fall through to Gate 4/5 CLARIFY logic.
          // Use top-scored docs for button generation so buttons reflect
          // the user's actual query terms, not random noise matches.
          const allMatched = scored.map(s => s.page);
          const { themes, dominantTheme } = computeThematicCoherence(allMatched);
          const topForButtons = scored.slice(0, 10).map(s => s.page);

          if (themes.length === 1) {
            // Gate 4: 6+ matched, all one theme → CLARIFY(THEME_OVERFLOW)
            console.log(`[STAGE 1]  ${matchedDocCount}/${allPages.length} docs matched, all theme: "${dominantTheme}" → CLARIFY(THEME_OVERFLOW)`);
            clarifyTriggerReason = 'THEME_OVERFLOW';
            clarifyMatchedMeta = topForButtons.map(d => ({ title: d.label, theme: d.theme, keywords: d.keywords ?? [] }));
            escapeHatchDocs = scored.slice(0, STAGE2A_SHORTLIST_MAX).map(s => s.page);
          } else {
            // Gate 5: 6+ matched, multiple themes → CLARIFY(TOO_BROAD)
            console.log(`[STAGE 1]  ${matchedDocCount}/${allPages.length} docs matched, themes: [${themes.join(', ')}] → CLARIFY(TOO_BROAD)`);
            clarifyTriggerReason = 'TOO_BROAD';
            clarifyMatchedMeta = topForButtons.map(d => ({ title: d.label, theme: d.theme, keywords: d.keywords ?? [] }));
            escapeHatchDocs = scored.slice(0, STAGE2A_SHORTLIST_MAX).map(s => s.page);
          }
        }
      }
    } catch (err) {
      console.error(`[agent] routing failed: ${(err as Error).message}`);
    }
  }

  // Step 3: Determine mode

  // Escape hatch: if MAX_CLARIFY_ROUNDS of CLARIFY replies have already been sent,
  // stop asking and try Stage 2A on the top-scored docs instead.
  // If ≥1 doc passes → ANSWER; if 0 pass → BASIC (genuine fallback).
  if (clarifyTriggerReason !== null && (context.clarifyRoundCounter ?? 0) >= MAX_CLARIFY_ROUNDS) {
    if (escapeHatchDocs.length > 0) {
      console.log(`[MAX_CLARIFY] ${context.clarifyRoundCounter} rounds reached → forcing Stage 2A with top ${escapeHatchDocs.length} docs`);
      const escapeResult = await runStage2(escapeHatchDocs, routingBaseMessage, [], currentQALog, 0);
      if (escapeResult.selectedPages.length > 0) {
        selectedPages = escapeResult.selectedPages;
      }
    } else {
      console.log(`[MAX_CLARIFY] ${context.clarifyRoundCounter} rounds reached, no escape docs → forcing BASIC`);
    }
    clarifyTriggerReason = null;
  }

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
  let ticketOffer = false;
  let knowledgeContent: string | null = BASIC_MODE;
  let queryContext: QueryContext | null = null;
  let answerSignal: import('./claude.ts').AnswerSignal | null = null;
  let answerContract: AnswerContract | null = null;

  if (finalMode === 'ANSWER') {
    // Load full content of passing docs only
    const capped = selectedPages.slice(0, ROUTER_MAX_DOCS);
    const rawContents = await loadKnowledgeFiles(capped);
    const contents = rawContents.filter((c): c is string => c !== null);
    const filteredContents = contents.map(c => stripTierContent(c, context.tier));

    if (filteredContents.length > 0) {
      knowledgeContent = filteredContents.join('\n\n---\n\n');
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
    buffer.addLlmCall({
      call_type: 'ANSWER',
      model: ANSWER_MODEL,
      input_tokens: chatResult.usage.input_tokens,
      output_tokens: chatResult.usage.output_tokens,
      cache_creation_tokens: chatResult.usage.cache_creation_tokens,
      cache_read_tokens: chatResult.usage.cache_read_tokens,
      stop_reason: chatResult.stop_reason,
      api_response_id: chatResult.api_response_id,
      latency_ms: chatResult.latency_ms,
      retry_count: 0,
      error_message: null,
      system_prompt_version_hash: PROMPT_VERSION_HASH,
    });
    reply = chatResult.reply;
    answerSignal = chatResult.signal;
    answerContract = chatResult.contract;

    // Persist tier if Sonnet detected it from the user's message
    if (chatResult.tier && chatResult.tier !== context.tier) {
      updateContext(sessionId, { tier: chatResult.tier });
      context.tier = chatResult.tier;
      console.log(`[TIER] Tier set to: ${chatResult.tier}`);
    }

  } else if (finalMode === 'CLARIFY') {
    if (shortTokenCandidates.length > 0) {
      // Short-token path: we know what the user probably means — ask directly.
      // No Haiku call needed; surface the prefix-matched candidates as buttons.
      const options = [...shortTokenCandidates, 'Something else'];
      const shortTokenPrefix = translate(SHORT_TOKEN_CLARIFY_PREFIX, context.language);
      const shortTokenButtons =
        `${shortTokenPrefix} [BUTTONS: ${options.join(' | ')}]`;
      const shortTokenIntro = await generateIntroLine(userMessage, 'SHORT_TOKEN', context.language);
      reply = shortTokenIntro ? `${shortTokenIntro}\n\n${shortTokenButtons}` : shortTokenButtons;
      console.log(`[CLARIFY] Short-token candidates: [${shortTokenCandidates.join(', ')}]`);
    } else {
      // Generate targeted question via Haiku — analyzes matched doc metadata
      // to produce options that actually split the doc set into useful groups.
      const [clarifyResult, introLine] = await Promise.all([
        generateSmartClarifyQuestion(
          userMessage,
          clarifyTriggerReason!,
          clarifyMatchedMeta,
          allAnswers,
          context.language,
          context.tools ?? []
        ),
        generateIntroLine(userMessage, clarifyTriggerReason ?? 'CLARIFY', context.language),
      ]);

      if (clarifyResult) {
        const questionBlock =
          `${clarifyResult.question} [BUTTONS: ${clarifyResult.options.join(' | ')}]`;
        reply = introLine ? `${introLine}\n\n${questionBlock}` : questionBlock;
      } else {
        const staticReply = staticClarifyReply(context.language);
        reply = introLine ? `${introLine}\n\n${staticReply}` : staticReply;
        console.log('[CLARIFY]  Fell back to static reply (generateSmartClarifyQuestion returned null)');
      }
    }

    recordTurn(sessionId, userMessage, reply);

    if (!context.originalQuestion) {
      updateContext(sessionId, { originalQuestion: userMessage });
    }

    // Increment for every CLARIFY reply — ensures MAX_CLARIFY_ROUNDS applies to all
    // CLARIFY triggers (Stage 1 gates and Stage 2B recovery alike).
    updateContext(sessionId, { clarifyRoundCounter: (context.clarifyRoundCounter ?? 0) + 1 });

  } else {
    // BASIC mode — static category buttons with context-aware prepend.
    // Also fires when Stage 2B chose Decision B (redirect to a fresh set of buttons).
    const clarifyingQA = currentQALog.map(e => ({ q: e.question, a: e.answer }));
    const introReason = contentVerifiedFailure ? 'BASIC_NO_DOCS' : 'BASIC';

    // Try AI-driven question first, fall back to static buttons
    const [smartBasicResult, basicIntro] = await Promise.all([
      generateSmartBasicQuestion(userMessage, clarifyingQA, manifest.categories, context.language),
      generateIntroLine(userMessage, introReason, context.language),
    ]);

    if (smartBasicResult) {
      const questionBlock =
        `${smartBasicResult.question} [BUTTONS: ${smartBasicResult.options.join(' | ')}]`;
      reply = basicIntro ? `${basicIntro}\n\n${questionBlock}` : questionBlock;
    } else {
      // Fallback to static category buttons
      const ctxButtons = basicContextButtons(userMessage, allPages);
      const staticReply = generateClarifyingQuestions(userMessage, null, clarifyingQA, ctxButtons, context.language);
      reply = basicIntro ? `${basicIntro}\n\n${staticReply}` : staticReply;
      console.log('[BASIC] AI question failed — fell back to static category buttons');
    }

    recordTurn(sessionId, userMessage, reply);

    if (!context.originalQuestion) {
      updateContext(sessionId, { originalQuestion: userMessage });
    }

    // Increment clarifyRoundCounter in BASIC mode too — enables progressive questioning
    // with the existing MAX_CLARIFY_ROUNDS safeguard (forces escalation after N rounds).
    updateContext(sessionId, { clarifyRoundCounter: (context.clarifyRoundCounter ?? 0) + 1 });
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
    // CLARIFY or BASIC — persist the qaLog (already includes incoming pairs
    // merged at the top of the pipeline, so no need to append again).
    if (incomingQAPairs.length > 0) {
      updateContext(sessionId, { qaLog: currentQALog });
    }
  }

  // Don't extract a "previous question" from JSON (clarify card replies).
  const previousQuestion = reply.trimStart().startsWith('{') ? null : extractPreviousQuestion(reply);
  updateContext(sessionId, { previousQuestion });

  if (detectFrustration(userMessage)) {
    const newCount = (context.frustrationCounter || 0) + 1;
    updateContext(sessionId, { frustrationCounter: newCount });
    console.log(`[agent] frustration counter: ${newCount}`);
    if (newCount >= FRUSTRATION_THRESHOLD) {
      ticketOffer = true;
      console.log(`[agent] frustration threshold (${FRUSTRATION_THRESHOLD}) reached → ticket offer`);
    }
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

  // Belt-and-suspenders tier detection from user message
  if (!context.tier) {
    const detectedTier = detectTier(userMessage);
    if (detectedTier) {
      updateContext(sessionId, { tier: detectedTier });
      console.log(`[TIER] Tier auto-detected from message: ${detectedTier}`);
    }
  }

  // Link user to customer when accounting tools are detected
  if (ENABLE_DB_WRITES && detectedTools.length > 0 && userId !== 'noop') {
    updateUserAccountingSystem(userId, detectedTools[0]).catch((err: Error) =>
      console.error('[agent] updateUserAccountingSystem failed:', err.message)
    );
  }

  // ── Bundle logic + flush ─────────────────────────────────────────────────
  // Open a bundle for this turn's question
  const bundleId = buffer.openBundle(userMessage);
  buffer.addMessage('user', userMessage);
  buffer.addMessage('bot', reply);

  // Populate pipeline trace fields on the bundle
  buffer.updateBundle({
    routing_mode: finalMode,
    answer_signal: answerSignal,
    answer_contract: answerContract,
    tier_detected: context.tier,
    trigger_reason: clarifyTriggerReason,
    frustration_counter: context.frustrationCounter || 0,
    clarify_round_counter: context.clarifyRoundCounter || 0,
    detected_tools: (context.tools || []).join(', ') || null,
    detected_setup_type: context.setupType || null,
    skip_routing: skipRouting,
    content_verified_failure: contentVerifiedFailure,
  });

  // Close the bundle if this is an ANSWER with COMPLETE signal
  if (finalMode === 'ANSWER' && answerSignal !== 'PARTIAL') {
    buffer.closeBundle('ANSWER');
  }

  // Flush to Supabase (fire-and-forget — don't block the response)
  buffer.flush().catch(err => console.error('[turn-buffer] flush failed:', err.message));

  // Always return bundleId so feedback buttons appear on every response
  return { reply, bundleId, ...(ticketOffer ? { ticketOffer: true } : {}) };
}
