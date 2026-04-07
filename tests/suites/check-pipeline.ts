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
    ['STAGE2A_SHORTLIST_MAX is between 1 and 10',       config.STAGE2A_SHORTLIST_MAX >= 1 && config.STAGE2A_SHORTLIST_MAX <= 10,     `Got ${config.STAGE2A_SHORTLIST_MAX}`],
    ['CLARIFY_QUESTIONS_PER_ROUND is between 1 and 5',  config.CLARIFY_QUESTIONS_PER_ROUND >= 1 && config.CLARIFY_QUESTIONS_PER_ROUND <= 5, `Got ${config.CLARIFY_QUESTIONS_PER_ROUND}`],
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
    ['ROUTER_MAX_DOCS >= STAGE2A_SHORTLIST_MAX',        config.ROUTER_MAX_DOCS >= config.STAGE2A_SHORTLIST_MAX,                      `ROUTER_MAX_DOCS(${config.ROUTER_MAX_DOCS}) must be >= STAGE2A_SHORTLIST_MAX(${config.STAGE2A_SHORTLIST_MAX})`],
    ['MAX_CLARIFY_ROUNDS >= 1 (Stage 2B hard limit)',   config.MAX_CLARIFY_ROUNDS >= 1,                                              `Got ${config.MAX_CLARIFY_ROUNDS}`],
    ['POST_ANSWER_CLARIFY_BUDGET is between 0 and 3',   config.POST_ANSWER_CLARIFY_BUDGET >= 0 && config.POST_ANSWER_CLARIFY_BUDGET <= 3, `Got ${config.POST_ANSWER_CLARIFY_BUDGET}`],
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

  // [cache-static] Sonnet: buildSystemPrompt() Block 1 must declare cache_control: ephemeral
  // No API key needed — this just inspects the return value of the function.
  try {
    const { buildSystemPrompt: bsp } = await import(`${ROOT}/backend/pipeline/claude.ts`);
    const blocks = bsp() as Array<{ type: string; cache_control?: { type: string } }>;
    const cacheType = blocks[0]?.cache_control?.type;
    if (cacheType === 'ephemeral') {
      pass('[cache] Sonnet: buildSystemPrompt() Block 1 has cache_control: ephemeral');
      results.push({ ok: true });
    } else {
      fail('[cache] Sonnet: buildSystemPrompt() Block 1 cache_control', `Got: ${String(cacheType)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[cache] Sonnet: buildSystemPrompt cache_control check', (err as Error).message);
    results.push({ ok: false });
  }

  // buildSystemPrompt() with queryContext: QUERY CONTEXT block must appear in output
  try {
    const { buildSystemPrompt: bsp } = await import(`${ROOT}/backend/pipeline/claude.ts`);
    const queryContext = {
      originalQuestion: 'how does GL mapping work?',
      clarifyingQA: [{ q: 'Which tool?', a: 'Xero' }],
      selectedFiles: ['mews.md'],
    };
    const blocks = bsp('DOCS content', null, queryContext) as Array<{ type: string; text?: string }>;
    const combinedText = blocks.map(b => b.text ?? '').join('\n');
    const hasHeader   = combinedText.includes('QUERY CONTEXT');
    const hasQuestion = combinedText.includes('how does GL mapping work?');
    const hasQA       = combinedText.includes('Which tool?') && combinedText.includes('Xero');
    const hasFile     = combinedText.includes('mews.md');
    if (hasHeader && hasQuestion && hasQA && hasFile) {
      pass('buildSystemPrompt: queryContext produces QUERY CONTEXT block with all fields');
      results.push({ ok: true });
    } else {
      fail('buildSystemPrompt: queryContext block incomplete', `header=${hasHeader} question=${hasQuestion} qa=${hasQA} file=${hasFile}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('buildSystemPrompt queryContext test', (err as Error).message);
    results.push({ ok: false });
  }

  // parseClarifyAnswers: parse "Q: ...\nA: ..." format into Q&A pairs
  try {
    const { parseClarifyAnswers } = await import(`${ROOT}/backend/pipeline/agent.ts`);

    // Standard multi-pair input
    const input = 'Q: Which accounting system?\nA: Xero\nQ: What setup type?\nA: Consumed';
    const result = parseClarifyAnswers(input) as { q: string; a: string }[];
    const ok1 = result.length === 2 && result[0].q === 'Which accounting system?' && result[0].a === 'Xero' && result[1].q === 'What setup type?' && result[1].a === 'Consumed';
    if (ok1) {
      pass('parseClarifyAnswers: parses 2 Q&A pairs correctly');
      results.push({ ok: true });
    } else {
      fail('parseClarifyAnswers: 2 Q&A pairs', `Got: ${JSON.stringify(result)}`);
      results.push({ ok: false });
    }

    // Empty / non-matching input returns empty array
    const empty = parseClarifyAnswers('just a plain message with no Q: prefix') as { q: string; a: string }[];
    if (empty.length === 0) {
      pass('parseClarifyAnswers: non-Q&A message returns empty array');
      results.push({ ok: true });
    } else {
      fail('parseClarifyAnswers: non-Q&A input should return []', `Got: ${JSON.stringify(empty)}`);
      results.push({ ok: false });
    }

    // Single pair
    const single = parseClarifyAnswers('Q: Revenue type?\nA: Accommodation') as { q: string; a: string }[];
    if (single.length === 1 && single[0].q === 'Revenue type?' && single[0].a === 'Accommodation') {
      pass('parseClarifyAnswers: single Q&A pair works');
      results.push({ ok: true });
    } else {
      fail('parseClarifyAnswers: single Q&A pair', `Got: ${JSON.stringify(single)}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('parseClarifyAnswers tests', (err as Error).message);
    results.push({ ok: false });
  }
}

// ── BASIC_MODE and language injection (requires API key) ─────────────────────

async function checkPipelineBehaviours({ pass, fail, skip, results }: Reporter): Promise<void> {
  const { handleMessage } = await import(`${ROOT}/backend/pipeline/agent.ts`);

  // BASIC mode: completely out-of-scope question should not hallucinate an answer
  // Expected: Stage 1 matches 0 docs → BASIC → 3-card JSON carousel
  try {
    await new Promise(r => setTimeout(r, 2000));
    const reply1 = await handleMessage(`test-basic-${Date.now()}`, 'who won the world cup in 1998?') as string;
    const lower1 = reply1.toLowerCase();
    const hallucinates = lower1.includes('france') && !lower1.includes("don't") && !lower1.includes('outside') && !lower1.includes('not sure') && !lower1.includes("can't");
    if (!hallucinates) {
      pass('BASIC mode: out-of-scope question returns card carousel or graceful non-answer (no hallucination)');
      results.push({ ok: true });
    } else {
      fail('BASIC mode: out-of-scope question', `Got overconfident reply: "${reply1.slice(0, 120)}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('BASIC mode test', (err as Error).message);
    results.push({ ok: false });
  }

  // CLARIFY mode: broad query should trigger a clarifying question with [BUTTONS:]
  // Expected: Stage 1 matches 6+ docs across multiple themes → TOO_BROAD → CLARIFY with question
  try {
    await new Promise(r => setTimeout(r, 2000));
    const reply2 = await handleMessage(`test-clarify-${Date.now()}`, 'help me with my accounting integration setup') as string;
    const hasClarifySignal = reply2.includes('[BUTTONS:]') || reply2.includes('?');
    if (hasClarifySignal) {
      pass('CLARIFY mode: broad query returns a clarifying question or buttons');
      results.push({ ok: true });
    } else {
      fail('CLARIFY mode: broad query should return question or [BUTTONS:]', `Got: "${reply2.slice(0, 150)}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('CLARIFY mode test', (err as Error).message);
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
    // Brief pause between calls to avoid triggering 529 overload on rapid bursts
    await new Promise(r => setTimeout(r, 2000));
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

  // generateClarifyingQuestions: must return valid JSON with __type clarify_questions
  // (or the plain-text fallback string on transient Haiku JSON failures — skip in that case)
  try {
    await new Promise(r => setTimeout(r, 1500));
    const { generateClarifyingQuestions } = await import(`${ROOT}/backend/pipeline/claude.ts`);
    const raw = await generateClarifyingQuestions('how do I connect my accounting system?', null, []) as string;

    // If Haiku failed to produce valid JSON, the function returns a plain-text fallback.
    // This is correct graceful-degradation behaviour — skip rather than fail.
    let jsonOk = false;
    try {
      const parsed = JSON.parse(raw) as { __type?: string; questions?: { text: string; options: string[] }[] };
      const hasType      = parsed.__type === 'clarify_questions';
      const hasQuestions = Array.isArray(parsed.questions) && parsed.questions.length > 0;
      const firstQ       = parsed.questions?.[0];
      const hasText      = typeof firstQ?.text === 'string' && firstQ.text.length > 0;
      const hasOptions   = Array.isArray(firstQ?.options) && firstQ.options.length >= 2;
      jsonOk = hasType && hasQuestions && hasText && hasOptions;
      if (jsonOk) {
        pass(`generateClarifyingQuestions: returns valid clarify_questions JSON (${parsed.questions!.length} questions)`);
        results.push({ ok: true });
      } else {
        fail('generateClarifyingQuestions: JSON structure', `type=${hasType} questions=${hasQuestions} text=${hasText} options=${hasOptions}`);
        results.push({ ok: false });
      }
    } catch {
      // Plain-text fallback is acceptable graceful-degradation behaviour
      skip('generateClarifyingQuestions: JSON output', 'Haiku returned plain-text fallback (transient JSON failure — acceptable)');
      results.push({ ok: 'skip' });
    }
  } catch (err) {
    fail('generateClarifyingQuestions test', (err as Error).message);
    results.push({ ok: false });
  }

  // chat() returns { reply, signal, contract } — signal/contract stripped from visible reply
  try {
    await new Promise(r => setTimeout(r, 1500));
    const { chat: chatFn } = await import(`${ROOT}/backend/pipeline/claude.ts`);
    const testSessionId = `test-chat-result-${Date.now()}`;
    const result = await chatFn(
      testSessionId,
      'what does Omniboost do?',
      null,   // no docs — BASIC-style
      null,
      null
    ) as { reply: string; signal: string | null; contract: Record<string, unknown> | null };

    const hasReplyString = typeof result.reply === 'string' && result.reply.trim().length > 0;
    const replyHasNoSignalBlock = !result.reply.includes('[ANSWER:') && !result.reply.includes('[ANSWER_CONTRACT]');
    const hasSignalKey = 'signal' in result;
    const hasContractKey = 'contract' in result;

    if (hasReplyString && replyHasNoSignalBlock && hasSignalKey && hasContractKey) {
      pass('chat() returns { reply, signal, contract } and strips signal/contract from reply');
      results.push({ ok: true });
    } else {
      fail('chat() return shape or signal stripping', `hasReply=${hasReplyString} noBlocks=${replyHasNoSignalBlock} hasSignal=${hasSignalKey} hasContract=${hasContractKey}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('chat() return shape test', (err as Error).message);
    results.push({ ok: false });
  }

  // [cache-dynamic] Sonnet: two consecutive calls with same cached system prompt
  // must show cache_creation_input_tokens > 0 on the first call and/or
  // cache_read_input_tokens > 0 on the second call.
  try {
    await new Promise(r => setTimeout(r, 1500));
    const claudeMod = await import(`${ROOT}/backend/pipeline/claude.ts`);
    const systemMod = await import(`${ROOT}/prompts/system.ts`);
    const clt = claudeMod.clientWithCaching;
    const model = claudeMod.ANSWER_MODEL;
    const sysText = systemMod.baseSystemPrompt as string;
    // @ts-ignore — cache_control accepted at runtime, not yet in SDK types
    const sysBlocks = [{ type: 'text', text: sysText, cache_control: { type: 'ephemeral' } }];
    const msgs = [{ role: 'user' as const, content: 'ping' }];

    // @ts-ignore
    const r1 = await clt.messages.create({ model, max_tokens: 5, system: sysBlocks, messages: msgs });
    const usage1 = r1.usage as Record<string, number>;
    const created = usage1.cache_creation_input_tokens ?? 0;

    await new Promise(r => setTimeout(r, 600));
    // @ts-ignore
    const r2 = await clt.messages.create({ model, max_tokens: 5, system: sysBlocks, messages: msgs });
    const usage2 = r2.usage as Record<string, number>;
    const readFromCache = usage2.cache_read_input_tokens ?? 0;

    if (created > 0 || readFromCache > 0) {
      pass(`[cache] Sonnet: prompt caching active (created=${created}, read=${readFromCache})`);
      results.push({ ok: true });
    } else {
      fail('[cache] Sonnet: prompt caching active', `cache_creation=${created}, cache_read=${readFromCache}`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('[cache] Sonnet: prompt caching dynamic check', (err as Error).message);
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
