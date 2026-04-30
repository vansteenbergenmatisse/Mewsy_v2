/**
 * session-memory.ts — Rolling conversation memory with Haiku summarization.
 *
 * Isolated module: owns its own Map, no shared state with session.ts.
 * To swap for a DB-backed version later, delete this folder and revert the
 * two lines in claude.ts that import from it.
 *
 * How it works:
 *   - Every completed turn (user + assistant pair) is appended to rawTurns.
 *   - When rawTurns reaches SUMMARIZE_EVERY pairs, Haiku compresses the oldest
 *     pairs into a rolling summary (folding in any previous summary). Those
 *     pairs are then dropped — the summary replaces them.
 *   - chat() injects { summary, rawTurns } into each Sonnet request so the
 *     model always has the full picture without unbounded context growth.
 *   - If summarization fails, rawTurns are kept intact (no data loss).
 *   - Summarization runs fire-and-forget so the 3rd reply is not delayed.
 */

import { callHaiku } from '../utils/haiku.ts';
import { SESSION_TTL_MINUTES, CLEANUP_INTERVAL_MS } from '../config/mewsie.config.ts';

const SUMMARIZE_EVERY = 3;
const TTL_MS = SESSION_TTL_MINUTES * 60 * 1000;

interface MemoryEntry {
  summary: string | null;
  rawTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
  summarizing: boolean;
  lastActive: number;
}

const store = new Map<string, MemoryEntry>();

function getEntry(sessionId: string): MemoryEntry {
  if (!store.has(sessionId)) {
    store.set(sessionId, { summary: null, rawTurns: [], summarizing: false, lastActive: Date.now() });
  }
  const entry = store.get(sessionId)!;
  entry.lastActive = Date.now();
  return entry;
}

/**
 * Returns the current summary and raw turns for injection into the next request.
 * Called by chat() before sending to Sonnet.
 */
export function getMemoryContext(sessionId: string): {
  summary: string | null;
  rawTurns: Array<{ role: 'user' | 'assistant'; content: string }>;
} {
  const entry = getEntry(sessionId);
  return { summary: entry.summary, rawTurns: [...entry.rawTurns] };
}

/**
 * Records a completed turn (user message + assistant reply) and triggers
 * summarization in the background once SUMMARIZE_EVERY pairs accumulate.
 * Fire-and-forget — callers do NOT await this.
 */
export function recordTurn(sessionId: string, userMessage: string, assistantReply: string): void {
  const entry = getEntry(sessionId);
  entry.rawTurns.push({ role: 'user', content: userMessage });
  entry.rawTurns.push({ role: 'assistant', content: assistantReply });

  if (!entry.summarizing && entry.rawTurns.length >= SUMMARIZE_EVERY * 2) {
    entry.summarizing = true;
    runSummarization(entry).catch((err) =>
      console.error('[memory] summarization error:', (err as Error).message)
    );
  }
}

/** Removes a session's memory entry. Used in tests. */
export function clearMemory(sessionId: string): void {
  store.delete(sessionId);
}

/** Narrow snapshot for tests — does not expose the internal MemoryEntry shape. */
export function getMemorySnapshot(sessionId: string): {
  summary: string | null;
  rawTurnCount: number;
  summarizing: boolean;
} | undefined {
  const e = store.get(sessionId);
  if (!e) return undefined;
  return { summary: e.summary, rawTurnCount: e.rawTurns.length, summarizing: e.summarizing };
}

/** Marks a session as expired (lastActive = 0) for TTL cleanup tests. */
export function backdateForTest(sessionId: string): void {
  const e = store.get(sessionId);
  if (e) e.lastActive = 0;
}

async function runSummarization(entry: MemoryEntry): Promise<void> {
  const toSummarize = entry.rawTurns.splice(0, SUMMARIZE_EVERY * 2);
  try {
    const newSummary = await buildSummary(entry.summary, toSummarize);
    if (newSummary) {
      entry.summary = newSummary;
    } else {
      entry.rawTurns.unshift(...toSummarize);
    }
  } finally {
    entry.summarizing = false;
  }
}

async function buildSummary(
  prevSummary: string | null,
  turns: Array<{ role: string; content: string }>
): Promise<string | null> {
  const prev = prevSummary ? `Previous summary:\n${prevSummary}\n\n` : '';
  const convo = turns
    .map(t => `${t.role === 'user' ? 'User' : 'Mewsie'}: ${t.content}`)
    .join('\n\n');
  const prompt =
    `${prev}Recent conversation:\n${convo}\n\n` +
    `Write a concise summary (3-5 sentences) of what the user has told us and what was answered. ` +
    `Focus on: tools/software they use, problems described, decisions made, and any context ` +
    `they have provided about their setup. Be factual and brief.`;

  try {
    const text = await callHaiku(prompt, 300);
    return text || null;
  } catch (err) {
    console.error('[memory] Haiku summarization failed:', (err as Error).message);
    return null;
  }
}

export function cleanMemoryStore(): void {
  const cutoff = Date.now() - TTL_MS;
  for (const [id, entry] of store.entries()) {
    if (entry.lastActive < cutoff) store.delete(id);
  }
}

const cleanupTimer = setInterval(cleanMemoryStore, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();
