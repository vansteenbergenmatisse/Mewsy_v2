/**
 * Suite 7: Session management
 * Tests session creation, history trimming, TTL expiry, and context updates.
 * No network calls — all in-memory.
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

interface TestResult {
  ok: boolean | 'skip';
}

interface Reporter {
  pass: (label: string) => void;
  fail: (label: string, err: string) => void;
  skip: (label: string, reason: string) => void;
  results: TestResult[];
}

export async function checkSession({ pass, fail, skip: _skip, results }: Reporter): Promise<void> {
  const {
    getSession,
    getHistory,
    addToHistory,
    getContext,
    updateContext,
    cleanSessions,
  } = await import(`${ROOT}/backend/pipeline/session.ts`);

  const { SESSION_MAX_PAIRS } = await import(`${ROOT}/backend/config/Mewsie.config.ts`);

  // ── Session creation ──────────────────────────────────────────────────────
  const id = `test-session-${Date.now()}`;
  const session = getSession(id);

  if (session && Array.isArray(session.history) && session.history.length === 0) {
    pass('new session is created with empty history');
    results.push({ ok: true });
  } else {
    fail('new session is created with empty history', `Got: ${JSON.stringify(session)}`);
    results.push({ ok: false });
  }

  if (session.context && session.context.frustrationCounter === 0) {
    pass('new session has zeroed context (frustrationCounter = 0)');
    results.push({ ok: true });
  } else {
    fail('new session has zeroed context', `Got frustrationCounter: ${session?.context?.frustrationCounter}`);
    results.push({ ok: false });
  }

  if (Array.isArray(session.context?.clarificationBundles) && session.context.clarificationBundles.length === 0) {
    pass('new session has empty clarificationBundles array');
    results.push({ ok: true });
  } else {
    fail('new session clarificationBundles', `Got: ${JSON.stringify(session?.context?.clarificationBundles)}`);
    results.push({ ok: false });
  }

  if (session.context.originalQuestion === null || session.context.originalQuestion === undefined) {
    pass('new session has null originalQuestion');
    results.push({ ok: true });
  } else {
    fail('new session has null originalQuestion', `Got: ${session.context.originalQuestion}`);
    results.push({ ok: false });
  }

  if (Array.isArray(session.context?.qaLog) && session.context.qaLog.length === 0) {
    pass('new session has empty qaLog array');
    results.push({ ok: true });
  } else {
    fail('new session qaLog', `Got: ${JSON.stringify((session?.context as Record<string, unknown>)?.qaLog)}`);
    results.push({ ok: false });
  }

  const ctx0 = session.context as unknown as Record<string, unknown>;

  if (ctx0.postAnswerMode === false) {
    pass('new session has postAnswerMode === false');
    results.push({ ok: true });
  } else {
    fail('new session postAnswerMode', `Got: ${JSON.stringify(ctx0.postAnswerMode)}`);
    results.push({ ok: false });
  }

  if (ctx0.postAnswerSignal === null) {
    pass('new session has postAnswerSignal === null');
    results.push({ ok: true });
  } else {
    fail('new session postAnswerSignal', `Got: ${JSON.stringify(ctx0.postAnswerSignal)}`);
    results.push({ ok: false });
  }

  if (ctx0.answerContract === null) {
    pass('new session has answerContract === null');
    results.push({ ok: true });
  } else {
    fail('new session answerContract', `Got: ${JSON.stringify(ctx0.answerContract)}`);
    results.push({ ok: false });
  }

  if (Array.isArray(ctx0.qaLogSnapshot) && (ctx0.qaLogSnapshot as unknown[]).length === 0) {
    pass('new session has empty qaLogSnapshot array');
    results.push({ ok: true });
  } else {
    fail('new session qaLogSnapshot', `Got: ${JSON.stringify(ctx0.qaLogSnapshot)}`);
    results.push({ ok: false });
  }

  if (ctx0.postAnswerClarifyUsed === false) {
    pass('new session has postAnswerClarifyUsed === false');
    results.push({ ok: true });
  } else {
    fail('new session postAnswerClarifyUsed', `Got: ${JSON.stringify(ctx0.postAnswerClarifyUsed)}`);
    results.push({ ok: false });
  }

  // ── History add and retrieve ───────────────────────────────────────────────
  addToHistory(id, 'user', 'hello');
  addToHistory(id, 'assistant', 'hi there');
  const history = getHistory(id);

  if (history.length === 2 && history[0].role === 'user' && history[1].role === 'assistant') {
    pass('addToHistory stores messages in correct order');
    results.push({ ok: true });
  } else {
    fail('addToHistory stores messages in correct order', `Got ${history.length} messages`);
    results.push({ ok: false });
  }

  // ── History trimming ───────────────────────────────────────────────────────
  // Add enough messages to exceed SESSION_MAX_PAIRS
  const trimId = `test-trim-${Date.now()}`;
  const totalMessages = (SESSION_MAX_PAIRS + 5) * 2; // more than the limit
  for (let i = 0; i < totalMessages; i++) {
    addToHistory(trimId, i % 2 === 0 ? 'user' : 'assistant', `message ${i}`);
  }
  const trimmedHistory = getHistory(trimId);
  const maxAllowed = SESSION_MAX_PAIRS * 2;

  if (trimmedHistory.length <= maxAllowed) {
    pass(`history is trimmed to max ${SESSION_MAX_PAIRS} pairs (${maxAllowed} messages)`);
    results.push({ ok: true });
  } else {
    fail(`history trimmed to ${maxAllowed} messages`, `Got ${trimmedHistory.length}`);
    results.push({ ok: false });
  }

  // Trimming keeps the most recent messages, not the oldest
  const lastMsg = trimmedHistory[trimmedHistory.length - 1];
  const expectedContent = `message ${totalMessages - 1}`;
  if (lastMsg.content === expectedContent) {
    pass('trimming keeps the most recent messages');
    results.push({ ok: true });
  } else {
    fail('trimming keeps most recent messages', `Last message was "${lastMsg.content}", expected "${expectedContent}"`);
    results.push({ ok: false });
  }

  // ── Context update ─────────────────────────────────────────────────────────
  const ctxId = `test-ctx-${Date.now()}`;
  updateContext(ctxId, { language: 'de', frustrationCounter: 2 });
  const ctx = getContext(ctxId);

  if (ctx.language === 'de' && ctx.frustrationCounter === 2) {
    pass('updateContext patches context correctly');
    results.push({ ok: true });
  } else {
    fail('updateContext patches context', `Got language="${ctx.language}", frustration=${ctx.frustrationCounter}`);
    results.push({ ok: false });
  }

  // Partial patch does not overwrite unrelated fields
  updateContext(ctxId, { frustrationCounter: 3 });
  const ctx2 = getContext(ctxId);
  if (ctx2.language === 'de' && ctx2.frustrationCounter === 3) {
    pass('partial context update does not overwrite other fields');
    results.push({ ok: true });
  } else {
    fail('partial context update', `language="${ctx2.language}", frustration=${ctx2.frustrationCounter}`);
    results.push({ ok: false });
  }

  // Non-destructive patch: updating one field does not wipe other fields
  updateContext(ctxId, { language: 'fr' });
  const ctx3 = getContext(ctxId);
  if (ctx3.frustrationCounter === 3 && ctx3.language === 'fr') {
    pass('context patch is non-destructive (other fields survive)');
    results.push({ ok: true });
  } else {
    fail('context patch is non-destructive', `frustrationCounter=${ctx3.frustrationCounter}, language="${ctx3.language}"`);
    results.push({ ok: false });
  }

  // ── TTL expiry (cleanSessions) ─────────────────────────────────────────────
  // Strategy: create a session, add a message so it has history, manually
  // backdate lastActive by holding the object reference, then clean.
  // We must NOT call getSession again before cleanSessions because getSession
  // refreshes lastActive on every call.
  const expiredId = `test-expired-${Date.now()}`;
  const expiredSession = getSession(expiredId); // create + get reference
  addToHistory(expiredId, 'user', 'this should be deleted'); // gives it history

  // Backdate directly via the reference — no further getSession call before clean
  expiredSession.lastActive = 0; // epoch time = definitely older than any TTL

  cleanSessions(); // should delete it

  // getSession now recreates a fresh empty session
  const afterClean = getSession(expiredId);
  if (afterClean.history.length === 0) {
    pass('cleanSessions removes expired sessions (TTL expiry works)');
    results.push({ ok: true });
  } else {
    fail('cleanSessions TTL expiry', `Expected empty history after expiry, got ${afterClean.history.length} messages`);
    results.push({ ok: false });
  }
}
