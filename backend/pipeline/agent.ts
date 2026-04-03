/**
 * agent.ts
 *
 * The pipeline coordinator. Every user message passes through here in order:
 *
 *   Step 1 — Load the manifest
 *     Read knowledge-manifest.json to get the full list of available docs.
 *
 *   Step 2 — Route (or skip routing)
 *     Check if routing should be skipped (short follow-up, greeting, etc.).
 *     If routing: Stage 1 selects categories, Stage 2 selects files within them.
 *     If skipping: reuse lastLoadedDocIds from session context.
 *
 *   Step 3 — Load
 *     Read the selected .md files from disk and build one context block.
 *     Enter BASIC_MODE if 0 docs returned or confidence < threshold.
 *
 *   Step 4 — Answer
 *     Pass message + context to claude.ts, which calls the API and returns a reply.
 *
 *   Step 5 — Update session context
 *     Store doc IDs, extract previousQuestion, detect frustration/tools/setup type,
 *     update clarifyRoundCounter.
 */

import { readFileSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chat, selectRelevantFiles, selectRelevantCategories } from './claude.ts';
import {
  getSession,
  updateContext,
} from './session.ts';
import {
  ROUTER_MAX_DOCS,
  ROUTER_CONFIDENCE_THRESHOLD,
  ROUTER_SINGLE_DOC_CONFIDENCE,
  ROUTER_HISTORY_ENABLED,
  ROUTER_HISTORY_PAIRS,
} from '../config/Mewsie.config.ts';
import type { Manifest, ManifestCategory } from '../types/manifest.ts';
import { migrateManifest } from '../scraper/pipeline/manifest.ts';

// __dirname is not available in ES modules by default — this reconstructs it
const __dirname = dirname(fileURLToPath(import.meta.url));

// Root of the project (two levels up: pipeline/ → backend/ → root)
const ROOT = join(__dirname, '../..');

// Path to the manifest that lists all available knowledge files
const INDEX_PATH = join(ROOT, 'knowledge', 'knowledge-manifest.json');

// Sentinel value passed to claude.ts when no knowledge files matched at all.
const BASIC_MODE = '__BASIC_MODE__';

// Sentinel prefix passed to claude.ts when docs were found but confidence is low.
// The agent appends candidate document summaries so Claude can ask a targeted question.
const CLARIFY_MODE_PREFIX = '__CLARIFY_MODE__';

// Pure greetings/acks/closings — routing is skipped for these
const SKIP_ROUTING_GREETINGS = new Set([
  'hi', 'hello', 'hey', 'thanks', 'thank you', 'ok', 'okay', 'got it',
  'bye', 'goodbye', 'sure', 'yes', 'no', 'yep', 'nope', 'great',
]);

// Shape of a flattened manifest page entry (used internally and by routing)
export interface ManifestPage {
  id: string;
  label: string;
  description: string;
  path: string;
  category: string;
  keywords?: string[];
  trigger_questions?: string[];
}

// ── Manifest loading ────────────────────────────────────────────────────────────
//
// Exported so tests can import and mock it directly.
// Synchronous so vi.spyOn(fs, 'readFileSync') works in unit tests.

export function loadManifest(manifestPath: string = INDEX_PATH): Manifest {
  const raw = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  return migrateManifest(raw);
}

// ── Manifest flattening ─────────────────────────────────────────────────────────

// Turns the manifest's files array into a flat array.
function flattenManifest(manifest: Manifest): ManifestPage[] {
  return manifest.files.map(file => ({
    id:               file.id,
    label:            file.title,
    description:      file.description,
    path:             file.path,
    category:         file.category,
    keywords:         file.keywords,
    trigger_questions: file.trigger_questions,
  }));
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
}

// Returns true when routing should be skipped for this message.
// Exported for testing.
export function shouldSkipRouting(userMessage: string, sessionContext: SessionContext, isFirstMessage: boolean = false): boolean {
  // Never skip on the first message of a session
  if (isFirstMessage) return false;

  const trimmed = userMessage.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Pure greeting or ack — skip routing only if we have docs to reuse
  // (no point skipping if there's nothing in the session to fall back on)
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

// ── Mode determination ─────────────────────────────────────────────────────────
//
// Exported for testing.

export type RoutingMode = 'ANSWER' | 'CLARIFY' | 'BASIC';

export function determineMode(result: { matches: string[]; confidence: number }): RoutingMode {
  const { matches, confidence } = result;
  if (matches.length === 0) return 'BASIC';
  if (confidence >= ROUTER_SINGLE_DOC_CONFIDENCE) return 'ANSWER';
  if (matches.length === 1 && confidence >= ROUTER_CONFIDENCE_THRESHOLD) return 'ANSWER';
  return 'CLARIFY';
}

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

// ── Main pipeline ───────────────────────────────────────────────────────────────

// Called by server.ts for every incoming chat message.
// Runs the full pipeline and returns the final reply string.
export async function handleMessage(sessionId: string, userMessage: string): Promise<string> {
  const session = getSession(sessionId);
  const context = session.context;
  const history = session.history;
  const isFirstMessage = history.length === 0;

  console.log(`[agent] isFirstMessage=${isFirstMessage} | history=${history.length} turns`);

  // Step 1: Load the manifest
  let manifest: Manifest = { categories: [], files: [] };
  try {
    manifest = loadManifest();
  } catch (err) {
    console.error(`[agent] could not load manifest: ${(err as Error).message}`);
  }

  const allPages = flattenManifest(manifest);

  // Step 2: Determine routing strategy
  let selectedPages: ManifestPage[] = [];
  let confidence = 0.0;

  const skipRouting = shouldSkipRouting(userMessage, context, isFirstMessage);

  if (skipRouting && context.lastLoadedDocIds.length > 0) {
    // Reuse the previously loaded docs
    selectedPages = allPages.filter(p => context.lastLoadedDocIds.includes(p.id));
    confidence = 1.0;
    console.log(`[agent] skip-routing — reusing docs: ${selectedPages.map(p => p.label).join(', ') || '(none)'}`);
  } else if (allPages.length > 0) {
    // Two-stage routing
    try {
      // Stage 1: classify into categories (only when categories are defined)
      let filesToSearch = allPages;

      if (manifest.categories.length > 0) {
        // Only run Stage 1 when ALL categories have descriptions.
        // If any category is undescribed, Haiku can't make reliable decisions
        // and may pick the wrong category, silently restricting Stage 2 to wrong files.
        const allCatsDescribed = manifest.categories.every(c => c.description.trim().length > 0);

        if (!allCatsDescribed) {
          console.log('[Stage 1] skipped — categories lack descriptions, searching all files');
        } else {
          const matchedCategoryIds = await selectRelevantCategories(userMessage, manifest.categories);
          console.log(`[Stage 1] Matched categories: [${matchedCategoryIds.join(', ')}]`);

          if (matchedCategoryIds.length === 0) {
            // All categories are well-described and none matched — genuine out-of-scope question
            console.log('[agent] Stage 1 returned no categories — entering BASIC_MODE');
            const reply = await chat(sessionId, userMessage, BASIC_MODE, context);
            updateContext(sessionId, { lastLoadedDocIds: [] });
            updateContext(sessionId, { previousQuestion: extractPreviousQuestion(reply) });
            return reply;
          }

          // Filter files to only those in matched categories
          const filtered = allPages.filter(p => matchedCategoryIds.includes(p.category));
          // Safety: if filtering leaves 0 files, fall back to full search
          filesToSearch = filtered.length > 0 ? filtered : allPages;
        }
        console.log(`[Stage 2] Searching ${filesToSearch.length} files`);
      }

      // Stage 2: file-level routing on the filtered subset
      let conversationHistory: { role: string; content: string }[] = [];
      if (ROUTER_HISTORY_ENABLED && history.length > 0) {
        const pairCount = ROUTER_HISTORY_PAIRS * 2;
        conversationHistory = history.slice(-pairCount);
      }

      const result = await selectRelevantFiles(filesToSearch, userMessage, conversationHistory);
      confidence = result.confidence;

      const cappedIndices = result.indices.slice(0, ROUTER_MAX_DOCS);
      selectedPages = cappedIndices.map(i => filesToSearch[i]).filter(Boolean);

      const mode = determineMode({ matches: selectedPages.map(p => p.id), confidence });
      const docNames = selectedPages.map(p => `"${p.label}"`).join(', ') || '(none)';
      console.log(`[Routing] Mode=${mode} | docs=[${docNames}] | conf=${confidence.toFixed(2)}`);
    } catch (err) {
      console.error(`[agent] routing failed: ${(err as Error).message}`);
    }
  }

  // Step 3: Load files and build context block.
  //
  // Decision tree:
  //   - Any docs AND confidence >= ROUTER_SINGLE_DOC_CONFIDENCE (0.95) → load all, answer directly
  //   - Exactly 1 doc AND confidence >= ROUTER_CONFIDENCE_THRESHOLD (0.85) → load and answer
  //   - Multiple docs AND confidence < 0.95 → CLARIFY_MODE (ambiguous query)
  //   - 1 doc but confidence < 0.85 → CLARIFY_MODE (low certainty)
  //   - No docs at all → BASIC_MODE
  let knowledgeContent: string = BASIC_MODE;

  if (selectedPages.length >= 1 && confidence >= ROUTER_SINGLE_DOC_CONFIDENCE) {
    const contents = await loadKnowledgeFiles(selectedPages);
    if (contents.length > 0) {
      knowledgeContent = contents.join('\n\n---\n\n');
      console.log(`[agent] high confidence (${confidence.toFixed(2)}) — answering directly with ${selectedPages.length} doc(s)`);
    }
  } else if (selectedPages.length === 1 && confidence >= ROUTER_CONFIDENCE_THRESHOLD) {
    const contents = await loadKnowledgeFiles(selectedPages);
    if (contents.length > 0) {
      knowledgeContent = contents.join('\n\n---\n\n');
    }
  } else if (selectedPages.length > 1) {
    const candidateSummary = selectedPages
      .map(p => `- ${p.label}: ${p.description}`)
      .join('\n');
    knowledgeContent = `${CLARIFY_MODE_PREFIX}\n${candidateSummary}`;
    console.log(`[agent] multiple candidates (${selectedPages.length}) — entering CLARIFY_MODE`);
  } else if (selectedPages.length === 1 && confidence < ROUTER_CONFIDENCE_THRESHOLD) {
    const candidateSummary = selectedPages
      .map(p => `- ${p.label}: ${p.description}`)
      .join('\n');
    knowledgeContent = `${CLARIFY_MODE_PREFIX}\n${candidateSummary}`;
    console.log(`[agent] low confidence (${confidence.toFixed(2)}) — entering CLARIFY_MODE`);
  } else {
    console.log('[agent] no docs found — entering BASIC_MODE');
  }

  // Step 4: Send message + knowledge to Claude, passing session context
  const finalMode = knowledgeContent === BASIC_MODE ? 'BASIC' : knowledgeContent.startsWith(CLARIFY_MODE_PREFIX) ? 'CLARIFY' : 'ANSWER';
  console.log(`[agent] → calling Sonnet in ${finalMode} mode (${finalMode === 'ANSWER' ? selectedPages.length + ' doc(s) loaded' : 'no docs'})`);
  const reply = await chat(sessionId, userMessage, knowledgeContent, context);

  console.log(`[agent] Sonnet replied (${reply.split(/\s+/).filter(Boolean).length} words)`);

  // Step 5: Update session context after each turn

  const didLoadDocs = knowledgeContent !== BASIC_MODE && !knowledgeContent.startsWith(CLARIFY_MODE_PREFIX);
  const loadedDocIds = didLoadDocs ? selectedPages.map(p => p.id) : [];
  updateContext(sessionId, { lastLoadedDocIds: loadedDocIds });

  const previousQuestion = extractPreviousQuestion(reply);
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

  const replyWordCount = reply.split(/\s+/).filter(Boolean).length;
  const replyEndsWithQuestion = reply.trim().slice(-200).includes('?');

  if (replyEndsWithQuestion) {
    updateContext(sessionId, { clarifyRoundCounter: (context.clarifyRoundCounter || 0) + 1 });
  } else if (replyWordCount > 100 && !replyEndsWithQuestion) {
    updateContext(sessionId, { clarifyRoundCounter: 0 });
  }

  return reply;
}
