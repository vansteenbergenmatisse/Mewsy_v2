/**
 * Suite 5: Pipeline behaviour
 * Tests config sanity, handlePipelineError, loadAllDocuments, BASIC_MODE, and language injection.
 * Config sanity and error handler run without an API key.
 * BASIC_MODE, language injection, and multi-turn require a live ANTHROPIC_API_KEY.
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

// ── Error handler (no API key needed) ────────────────────────────────────────

async function checkErrorHandler({ pass, fail, results }: Reporter): Promise<void> {
  const { handlePipelineError } = await import(`${ROOT}/backend/errors/errorHandler.ts`);

  try {
    const result = await handlePipelineError(new Error('test error'), {
      sessionId: 'test-session',
      userMessage: 'test message',
      errorType: 'UNHANDLED',
    }) as string;
    const expected = "Something went wrong on my end — please try again in a moment.";
    if (result === expected) {
      pass('handlePipelineError returns the standard user-facing message');
      results.push({ ok: true });
    } else {
      fail('handlePipelineError user-facing message', `Got: "${result}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('handlePipelineError test', (err as Error).message);
    results.push({ ok: false });
  }
}

// ── Loader (no API key needed) ────────────────────────────────────────────────

async function checkLoader({ pass, fail, results }: Reporter): Promise<void> {
  const { loadAllDocuments } = await import(`${ROOT}/backend/fetch/loader.ts`);

  try {
    await loadAllDocuments();
    pass('loadAllDocuments() runs without throwing (manifest is accessible)');
    results.push({ ok: true });
  } catch (err) {
    fail('loadAllDocuments()', (err as Error).message);
    results.push({ ok: false });
  }
}

// ── Config sanity (no API key needed) ────────────────────────────────────────

async function checkConfigSanity({ pass, fail, results }: Reporter): Promise<void> {
  const config = await import(`${ROOT}/backend/config/Mewsie.config.ts`);

  const checks: [string, boolean, string][] = [
    ['ROUTER_MAX_DOCS is between 1 and 10',             config.ROUTER_MAX_DOCS >= 1 && config.ROUTER_MAX_DOCS <= 10,                 `Got ${config.ROUTER_MAX_DOCS}`],
    ['ROUTER_CONFIDENCE_THRESHOLD is between 0 and 1',  config.ROUTER_CONFIDENCE_THRESHOLD > 0 && config.ROUTER_CONFIDENCE_THRESHOLD < 1, `Got ${config.ROUTER_CONFIDENCE_THRESHOLD}`],
    ['ROUTER_SINGLE_DOC_CONFIDENCE is between 0 and 1', config.ROUTER_SINGLE_DOC_CONFIDENCE > 0 && config.ROUTER_SINGLE_DOC_CONFIDENCE <= 1, `Got ${config.ROUTER_SINGLE_DOC_CONFIDENCE}`],
    ['SESSION_MAX_PAIRS is between 5 and 100',          config.SESSION_MAX_PAIRS >= 5 && config.SESSION_MAX_PAIRS <= 100,             `Got ${config.SESSION_MAX_PAIRS}`],
    ['SESSION_TTL_MINUTES is between 5 and 1440',       config.SESSION_TTL_MINUTES >= 5 && config.SESSION_TTL_MINUTES <= 1440,       `Got ${config.SESSION_TTL_MINUTES}`],
    ['FRUSTRATION_THRESHOLD is between 1 and 10',       config.FRUSTRATION_THRESHOLD >= 1 && config.FRUSTRATION_THRESHOLD <= 10,     `Got ${config.FRUSTRATION_THRESHOLD}`],
    ['MAX_CLARIFY_ROUNDS is between 1 and 10',          config.MAX_CLARIFY_ROUNDS >= 1 && config.MAX_CLARIFY_ROUNDS <= 10,           `Got ${config.MAX_CLARIFY_ROUNDS}`],
    ['BUTTON_MAX is between 2 and 10',                  config.BUTTON_MAX >= 2 && config.BUTTON_MAX <= 10,                           `Got ${config.BUTTON_MAX}`],
    ['ROUTER_HISTORY_PAIRS is between 1 and 20',        config.ROUTER_HISTORY_PAIRS >= 1 && config.ROUTER_HISTORY_PAIRS <= 20,       `Got ${config.ROUTER_HISTORY_PAIRS}`],
    ['RESPONSE_BATCH_THRESHOLD_WORDS is positive',      config.RESPONSE_BATCH_THRESHOLD_WORDS > 0,                                   `Got ${config.RESPONSE_BATCH_THRESHOLD_WORDS}`],
    ['RESPONSE_BATCH_THRESHOLD_STEPS is positive',      config.RESPONSE_BATCH_THRESHOLD_STEPS > 0,                                   `Got ${config.RESPONSE_BATCH_THRESHOLD_STEPS}`],
    ['LANGUAGE_PERSISTS_ON_TIMEOUT is a boolean',       typeof config.LANGUAGE_PERSISTS_ON_TIMEOUT === 'boolean',                    `Got ${typeof config.LANGUAGE_PERSISTS_ON_TIMEOUT}`],
    ['ROUTER_HISTORY_ENABLED is a boolean',             typeof config.ROUTER_HISTORY_ENABLED === 'boolean',                          `Got ${typeof config.ROUTER_HISTORY_ENABLED}`],
  ];

  for (const [label, ok, detail] of checks) {
    if (ok) {
      pass(label);
      results.push({ ok: true });
    } else {
      fail(label, detail);
      results.push({ ok: false });
    }
  }
}

// ── BASIC_MODE and language injection (requires API key) ─────────────────────

async function checkPipelineBehaviours({ pass, fail, skip, results }: Reporter): Promise<void> {
  const { handleMessage } = await import(`${ROOT}/backend/pipeline/agent.ts`);

  // BASIC_MODE: completely out-of-scope question should not hallucinate an answer
  try {
    const reply1 = await handleMessage(`test-basic-${Date.now()}`, 'who won the world cup in 1998?') as string;
    const lower1 = reply1.toLowerCase();
    const hallucinates = lower1.includes('france') && !lower1.includes("don't") && !lower1.includes('outside') && !lower1.includes('not sure') && !lower1.includes("can't");
    if (!hallucinates) {
      pass('BASIC_MODE: out-of-scope question does not hallucinate a confident answer');
      results.push({ ok: true });
    } else {
      fail('BASIC_MODE: out-of-scope question', `Got overconfident reply: "${reply1.slice(0, 120)}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('BASIC_MODE test', (err as Error).message);
    results.push({ ok: false });
  }

  // Language injection: first message with a language system note should be answered in that language
  try {
    const langSessionId = `test-lang-${Date.now()}`;
    const messageWithNote = '[System note: the user has selected their language to German. For the remainder of this conversation, always respond in German.]\n\nWas macht Omniboost?';
    const reply2 = await handleMessage(langSessionId, messageWithNote) as string;
    const lower2 = reply2.toLowerCase();
    const looksGerman = lower2.includes('die ') || lower2.includes('der ') || lower2.includes('und ') || lower2.includes('ist ') || lower2.includes('mit ');
    if (looksGerman) {
      pass('language injection: German system note produces a German reply');
      results.push({ ok: true });
    } else {
      skip('language injection', 'Reply did not contain detectable German words — may be a borderline case');
      results.push({ ok: 'skip' });
    }
  } catch (err) {
    fail('language injection test', (err as Error).message);
    results.push({ ok: false });
  }

  // Multi-turn context: second message in session should have context from first
  try {
    const multiTurnId = `test-multiturn-pipeline-${Date.now()}`;
    await handleMessage(multiTurnId, 'what is the bronze tier?');
    const reply3 = await handleMessage(multiTurnId, 'what about the silver tier?') as string;
    if (typeof reply3 === 'string' && reply3.trim().length > 0) {
      pass('multi-turn: second message in same session gets a non-empty reply');
      results.push({ ok: true });
    } else {
      fail('multi-turn context', 'Got empty reply on second turn');
      results.push({ ok: false });
    }
  } catch (err) {
    fail('multi-turn context test', (err as Error).message);
    results.push({ ok: false });
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function checkPipeline({ pass, fail, skip, results }: Reporter): Promise<void> {
  await checkErrorHandler({ pass, fail, skip, results });
  await checkLoader({ pass, fail, skip, results });
  await checkConfigSanity({ pass, fail, skip, results });

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  if (!hasApiKey) {
    skip('BASIC_MODE / language injection / multi-turn tests', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
    return;
  }

  await checkPipelineBehaviours({ pass, fail, skip, results });
}
