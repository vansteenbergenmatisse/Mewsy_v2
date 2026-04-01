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
 *     If routing: ask Claude which files are relevant — returns indices + confidence.
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

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { chat, selectRelevantFiles } from './claude.ts';
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

// Shape of a flattened manifest page entry
interface ManifestPage {
  id: string;
  label: string;
  description: string;
  path: string;
  keywords?: string[];
}

// Shape of the raw manifest page object
interface RawManifestPage {
  title?: string;
  description?: string;
  path: string;
  keywords?: string[];
}

// Shape of the parsed knowledge-manifest.json
interface Manifest {
  pages?: Record<string, RawManifestPage>;
}

// ── Manifest loading ───────────────────────────────────────────────────────────

async function loadManifest(): Promise<Manifest> {
  const raw = await readFile(INDEX_PATH, 'utf-8');
  return JSON.parse(raw) as Manifest;
}

// ── Manifest flattening ────────────────────────────────────────────────────────

// Turns the manifest's pages object into a flat array with an id field.
// Each item: { id, label, description, path }
function flattenManifest(manifest: Manifest): ManifestPage[] {
  return Object.entries(manifest.pages ?? {}).map(([key, page]) => ({
    id:          key,
    label:       page.title       ?? key,
    description: page.description ?? '',
    path:        page.path,
    keywords:    page.keywords,
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

// ── Skip-routing detection ─────────────────────────────────────────────────────

// Shape of the session context passed from session.ts
interface SessionContext {
  language: string | null;
  tools: string[];
  setupType: string | null;
  lastLoadedDocIds: string[];
  frustrationCounter: number;
  clarifyRoundCounter: number;
  previousQuestion: string | null;
}

// Returns true when routing should be skipped for this message.
// Skips only for pure greetings/acks/closings, or when the previous assistant
// message was a clarifying question AND the user's reply is very short (≤ 4 words)
// AND we already have loaded docs to reuse. Everything else routes normally.
function shouldSkipRouting(userMessage: string, sessionContext: SessionContext, isFirstMessage: boolean): boolean {
  // Never skip on the first message of a session
  if (isFirstMessage) return false;

  const trimmed = userMessage.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;

  // Pure greeting or ack — these never need document routing
  if (SKIP_ROUTING_GREETINGS.has(trimmed)) return true;

  // Only skip if: Mewsie just asked a clarifying question AND the user gave a
  // very short reply (≤ 4 words, e.g. "Consumed", "step 2", "Xero") AND we have
  // docs from the previous turn to reuse. This is the one valid skip case.
  const prevQ = sessionContext.previousQuestion;
  const hasDocsToReuse = sessionContext.lastLoadedDocIds.length > 0;
  if (prevQ && hasDocsToReuse && wordCount <= 4 && !userMessage.includes('?')) {
    return true;
  }

  return false;
}

// ── Context extraction helpers ─────────────────────────────────────────────────

// Extracts the sentence containing ? from the response (the question Mewsie asked).
// Returns null if no question is found.
function extractPreviousQuestion(response: string): string | null {
  if (!response || !response.includes('?')) return null;
  // Split on sentence boundaries and find the last sentence ending with ?
  const sentences = response.split(/(?<=[.!?])\s+/);
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (sentences[i].includes('?')) {
      return sentences[i].trim();
    }
  }
  return null;
}

// Detects frustration signals in the user message.
const FRUSTRATION_SIGNALS = [
  "doesn't work", "not working", "still broken", "same issue", "again",
  "useless", "terrible", "wrong answer", "that's wrong", "human",
  "real person", "live agent", "support ticket",
];

function detectFrustration(message: string): boolean {
  const lower = message.toLowerCase();
  return FRUSTRATION_SIGNALS.some(signal => lower.includes(signal));
}

// Detects tool mentions in the user message.
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

// Detects setup type mentions in user message or response.
const SETUP_TYPES = ['Consumed', 'Closed', 'Hybrid'];

function detectSetupType(text: string): string | null {
  for (const type of SETUP_TYPES) {
    if (new RegExp(type, 'i').test(text)) {
      return type;
    }
  }
  return null;
}

// ── Main pipeline ──────────────────────────────────────────────────────────────

// Called by server.ts for every incoming chat message.
// Runs the full pipeline and returns the final reply string.
export async function handleMessage(sessionId: string, userMessage: string): Promise<string> {
  const session = getSession(sessionId);
  const context = session.context;
  const history = session.history;
  const isFirstMessage = history.length === 0;

  // Step 1: Load the manifest and flatten it into a list of pages
  let allPages: ManifestPage[] = [];
  try {
    const manifest = await loadManifest();
    allPages = flattenManifest(manifest);
  } catch (err) {
    console.error(`[agent] could not load manifest: ${(err as Error).message}`);
  }

  // Step 2: Determine routing strategy
  let selectedPages: ManifestPage[] = [];
  let confidence = 0.0;

  const skipRouting = shouldSkipRouting(userMessage, context, isFirstMessage);

  if (skipRouting && context.lastLoadedDocIds.length > 0) {
    // Reuse the previously loaded docs
    selectedPages = allPages.filter(p => context.lastLoadedDocIds.includes(p.id));
    confidence = 1.0; // Treat as confident since we're continuing the same topic
    console.log(`[agent] skip-routing — reusing docs: ${selectedPages.map(p => p.id).join(', ') || '(none)'}`);
  } else if (allPages.length > 0) {
    // Route normally using Claude
    try {
      // Build conversation history to pass to router
      let conversationHistory: { role: string; content: string }[] = [];
      if (ROUTER_HISTORY_ENABLED && history.length > 0) {
        const pairCount = ROUTER_HISTORY_PAIRS * 2; // pairs × 2 messages each
        conversationHistory = history.slice(-pairCount);
      }

      const result = await selectRelevantFiles(allPages, userMessage, conversationHistory);
      confidence = result.confidence;

      // Hard-cap at ROUTER_MAX_DOCS
      const cappedIndices = result.indices.slice(0, ROUTER_MAX_DOCS);
      selectedPages = cappedIndices.map(i => allPages[i]).filter(Boolean);

      console.log(
        `[agent] routed to: ${selectedPages.map(p => p.id).join(', ') || '(none)'} ` +
        `(confidence: ${confidence.toFixed(2)})`
      );
    } catch (err) {
      console.error(`[agent] selectRelevantFiles failed: ${(err as Error).message}`);
    }
  }

  // Step 3: Load files and build context block.
  //
  // Decision tree:
  //   - Any docs AND confidence >= ROUTER_SINGLE_DOC_CONFIDENCE (0.95) → load all, answer directly
  //   - Exactly 1 doc AND confidence >= ROUTER_CONFIDENCE_THRESHOLD (0.80) → load and answer
  //   - Multiple docs AND confidence < 0.95 → CLARIFY_MODE (ambiguous query)
  //   - 1 doc but confidence < 0.80 → CLARIFY_MODE (low certainty)
  //   - No docs at all → BASIC_MODE
  //
  // The high-confidence shortcut prevents CLARIFY_MODE when the router is certain
  // even if it returned multiple closely related docs.
  let knowledgeContent: string = BASIC_MODE;

  if (selectedPages.length >= 1 && confidence >= ROUTER_SINGLE_DOC_CONFIDENCE) {
    // High confidence — load all matched docs and answer directly, no clarification needed
    const contents = await loadKnowledgeFiles(selectedPages);
    if (contents.length > 0) {
      knowledgeContent = contents.join('\n\n---\n\n');
      console.log(`[agent] high confidence (${confidence.toFixed(2)}) — answering directly with ${selectedPages.length} doc(s)`);
    }
  } else if (selectedPages.length === 1 && confidence >= ROUTER_CONFIDENCE_THRESHOLD) {
    // Clear single match — load and answer
    const contents = await loadKnowledgeFiles(selectedPages);
    if (contents.length > 0) {
      knowledgeContent = contents.join('\n\n---\n\n');
    }
  } else if (selectedPages.length > 1) {
    // Multiple candidates with moderate confidence — ambiguous query, ask the user to pick one
    const candidateSummary = selectedPages
      .map(p => `- ${p.label}: ${p.description}`)
      .join('\n');
    knowledgeContent = `${CLARIFY_MODE_PREFIX}\n${candidateSummary}`;
    console.log(`[agent] multiple candidates (${selectedPages.length}) — entering CLARIFY_MODE`);
  } else if (selectedPages.length === 1 && confidence < ROUTER_CONFIDENCE_THRESHOLD) {
    // Single match but low confidence — ask to confirm
    const candidateSummary = selectedPages
      .map(p => `- ${p.label}: ${p.description}`)
      .join('\n');
    knowledgeContent = `${CLARIFY_MODE_PREFIX}\n${candidateSummary}`;
    console.log(`[agent] low confidence (${confidence.toFixed(2)}) — entering CLARIFY_MODE`);
  } else {
    console.log('[agent] no docs found — entering BASIC_MODE');
  }

  // Step 4: Send message + knowledge to Claude, passing session context
  const reply = await chat(sessionId, userMessage, knowledgeContent, context);

  // Step 5: Update session context after each turn

  // Store doc IDs that were loaded (only when full docs were passed to Claude)
  const didLoadDocs = knowledgeContent !== BASIC_MODE && !knowledgeContent.startsWith(CLARIFY_MODE_PREFIX);
  const loadedDocIds = didLoadDocs ? selectedPages.map(p => p.id) : [];
  updateContext(sessionId, { lastLoadedDocIds: loadedDocIds });

  // Extract previousQuestion from the reply
  const previousQuestion = extractPreviousQuestion(reply);
  updateContext(sessionId, { previousQuestion });

  // Detect frustration signals in user message
  if (detectFrustration(userMessage)) {
    const newCount = (context.frustrationCounter || 0) + 1;
    updateContext(sessionId, { frustrationCounter: newCount });
    console.log(`[agent] frustration counter: ${newCount}`);
  }

  // Detect tool mentions (no duplicates)
  const detectedTools = detectTools(userMessage);
  if (detectedTools.length > 0) {
    const existingTools = context.tools || [];
    const mergedTools = [...new Set([...existingTools, ...detectedTools])];
    updateContext(sessionId, { tools: mergedTools });
  }

  // Detect setup type in user message or reply
  if (!context.setupType) {
    const setupType = detectSetupType(userMessage) || detectSetupType(reply);
    if (setupType) {
      updateContext(sessionId, { setupType });
    }
  }

  // Update clarifyRoundCounter
  const replyWordCount = reply.split(/\s+/).filter(Boolean).length;
  const replyEndsWithQuestion = reply.trim().slice(-200).includes('?');

  if (replyEndsWithQuestion) {
    // Mewsie asked something — increment counter
    updateContext(sessionId, { clarifyRoundCounter: (context.clarifyRoundCounter || 0) + 1 });
  } else if (replyWordCount > 100 && !replyEndsWithQuestion) {
    // Full answer given — reset counter
    updateContext(sessionId, { clarifyRoundCounter: 0 });
  }

  return reply;
}
