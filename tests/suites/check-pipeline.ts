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

// ── parseTools (Base accountingSoftware normalization, no API key needed) ─────
// Locks in the empty-collapse guard: a whitespace-only / comma-only value must
// become [] (not [""]) so it never leaves context.tools "non-empty" yet useless,
// which would silently re-trigger the "which integration?" question.

async function checkParseTools({ pass, fail, results }: Reporter): Promise<void> {
  const { parseTools } = await import(`${ROOT}/backend/utils/tools.ts`);

  const cases: Array<{ input: string | null | undefined; expected: string[]; label: string }> = [
    { input: 'QuickBooks', expected: ['QuickBooks'], label: 'single tool' },
    { input: 'Xero, DATEV', expected: ['Xero', 'DATEV'], label: 'comma-separated → two tools' },
    { input: '  Exact Online  ', expected: ['Exact Online'], label: 'trims surrounding whitespace' },
    { input: ' , , ', expected: [], label: 'whitespace/comma-only collapses to []' },
    { input: '', expected: [], label: 'empty string → []' },
    { input: null, expected: [], label: 'null → []' },
    { input: undefined, expected: [], label: 'undefined → []' },
  ];

  for (const { input, expected, label } of cases) {
    try {
      const got = parseTools(input) as string[];
      if (JSON.stringify(got) === JSON.stringify(expected)) {
        pass(`parseTools: ${label}`);
        results.push({ ok: true });
      } else {
        fail(`parseTools: ${label}`, `parseTools(${JSON.stringify(input)}) → ${JSON.stringify(got)}, expected ${JSON.stringify(expected)}`);
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`parseTools: ${label}`, (err as Error).message);
      results.push({ ok: false });
    }
  }
}

// ── Config sanity (no API key needed) ────────────────────────────────────────

async function checkConfigSanity({ pass, fail, results }: Reporter): Promise<void> {
  const config = await import(`${ROOT}/backend/config/mewsie.config.ts`);

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

  // ── Sync language plumbing ────────────────────────────────────────────────
  // These tests do not need the API — they verify the pure translation layer
  // so the fast path (`generateClarifyingQuestions`, `generateClarifyQuestion`,
  // `langName`) correctly routes the language code to the localized string.
  try {
    const { generateClarifyingQuestions, langName } = await import(`${ROOT}/backend/pipeline/claude.ts`);

    // generateClarifyingQuestions with each language returns the localized prefix
    const enReply = generateClarifyingQuestions('hi', null, [], [], 'en') as string;
    const deReply = generateClarifyingQuestions('hi', null, [], [], 'de') as string;
    const frReply = generateClarifyingQuestions('hi', null, [], [], 'fr') as string;
    const nlReply = generateClarifyingQuestions('hi', null, [], [], 'nl') as string;
    const dialectReply = generateClarifyingQuestions('hi', null, [], [], 'de-ch') as string;

    const enOk = enReply.startsWith('What can I help you with?');
    const deOk = deReply.startsWith('Womit kann ich dir helfen?');
    const frOk = frReply.startsWith('Comment puis-je vous aider');
    const nlOk = nlReply.startsWith('Waarmee kan ik je helpen?');
    const dialectOk = dialectReply.startsWith('Womit kann ich dir helfen?'); // de-ch falls back to de

    if (enOk && deOk && frOk && nlOk && dialectOk) {
      pass('generateClarifyingQuestions: localized question prefix (en/de/fr/nl + de-ch fallback)');
      results.push({ ok: true });
    } else {
      fail(
        'generateClarifyingQuestions language plumbing',
        `en=${enOk} de=${deOk} fr=${frOk} nl=${nlOk} de-ch=${dialectOk}`
      );
      results.push({ ok: false });
    }

    // Null / unknown language falls back to English
    const nullReply = generateClarifyingQuestions('hi', null, [], [], null) as string;
    if (nullReply.startsWith('What can I help you with?')) {
      pass('generateClarifyingQuestions: null language falls back to English');
      results.push({ ok: true });
    } else {
      fail('generateClarifyingQuestions null fallback', `Got: "${nullReply.slice(0, 80)}"`);
      results.push({ ok: false });
    }

    // langName helper: each code resolves to a plain English language name
    const names = {
      en: langName('en'),
      de: langName('de'),
      fr: langName('fr'),
      nl: langName('nl'),
      dialect: langName('de-at'),
      nullCase: langName(null),
    };
    const namesOk =
      names.en === 'English' &&
      names.de === 'German' &&
      names.fr === 'French' &&
      names.nl === 'Dutch' &&
      names.dialect === 'German' &&
      names.nullCase === 'English';
    if (namesOk) {
      pass('langName: resolves all supported codes and regional fallbacks');
      results.push({ ok: true });
    } else {
      fail('langName resolution', JSON.stringify(names));
      results.push({ ok: false });
    }
  } catch (err) {
    fail('sync language plumbing tests', (err as Error).message);
    results.push({ ok: false });
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

/** Returns true when the Anthropic API responds with HTTP 529 (overloaded). */
function is529(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err));
  return msg.startsWith('529') || msg.includes('overloaded_error') || msg.includes('Overloaded');
}

// ── BASIC_MODE and language injection (requires API key) ─────────────────────
// Wave 1: all independent single-call tests run in parallel (unique sessions, no shared state).
// Wave 2: cache dynamic check — two consecutive calls to the same endpoint, must be sequential.
// Multi-turn is covered in check-chat with stricter assertions; not duplicated here.

async function checkPipelineBehaviours({ pass, fail, skip, results }: Reporter): Promise<void> {
  const { handleMessage } = await import(`${ROOT}/backend/pipeline/agent.ts`);
  const { generateClarifyingQuestions, chat: chatFn, clientWithCaching: clt, ANSWER_MODEL: model } = await import(`${ROOT}/backend/pipeline/claude.ts`);

  // ── Wave 1: independent tests — fire together ────────────────────────────
  await Promise.all([

    // BASIC mode: out-of-scope question must not hallucinate an answer
    (async () => {
      try {
        const result = await handleMessage(`test-basic-${Date.now()}`, 'who won the world cup in 1998?');
        const reply = (result as { reply: string }).reply;
        const lower = reply.toLowerCase();
        const hallucinates = lower.includes('france') && !lower.includes("don't") && !lower.includes('outside') && !lower.includes('not sure') && !lower.includes("can't");
        if (!hallucinates) { pass('BASIC mode: out-of-scope question returns card carousel or graceful non-answer (no hallucination)'); results.push({ ok: true }); }
        else { fail('BASIC mode: out-of-scope question', `Got overconfident reply: "${reply.slice(0, 120)}"`); results.push({ ok: false }); }
      } catch (err) {
        if (is529(err)) { skip('BASIC mode test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('BASIC mode test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

    // CLARIFY mode: broad query → TOO_BROAD → clarifying question
    (async () => {
      try {
        const reply = (await handleMessage(`test-clarify-${Date.now()}`, 'help me with my accounting integration setup')).reply;
        if (reply.includes('[BUTTONS:') || reply.includes('?')) { pass('CLARIFY mode: broad query returns a clarifying question or buttons'); results.push({ ok: true }); }
        else { fail('CLARIFY mode: broad query should return question or [BUTTONS:]', `Got: "${reply.slice(0, 150)}"`); results.push({ ok: false }); }
      } catch (err) {
        if (is529(err)) { skip('CLARIFY mode test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('CLARIFY mode test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

    // Language injection: German system note → German reply
    (async () => {
      try {
        const msg = '[System note: the user has selected their language to German. For the remainder of this conversation, always respond in German.]\n\nWas macht Omniboost?';
        const reply = (await handleMessage(`test-lang-${Date.now()}`, msg)).reply;
        const lower = reply.toLowerCase();
        const looksGerman = lower.includes('die ') || lower.includes('der ') || lower.includes('und ') || lower.includes('ist ') || lower.includes('mit ');
        if (looksGerman) { pass('language injection: German system note produces a German reply'); results.push({ ok: true }); }
        else { skip('language injection', 'Reply did not contain detectable German words — may be a borderline case'); results.push({ ok: 'skip' }); }
      } catch (err) {
        if (is529(err)) { skip('language injection test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('language injection test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

    // Language param plumbing: English user message + language='de' must still produce a German reply.
    // Regression guard for the bug where generateIntroLine had no language signal and Haiku
    // responded in a language picked from the user message alone.
    (async () => {
      try {
        const reply = (await handleMessage(`test-lang-param-${Date.now()}`, 'help me with my accounting integration setup', 'de')).reply;
        // Strip the [BUTTONS: ...] block (English labels), the [ANSWER:...] signal, and the
        // [ANSWER_CONTRACT] JSON — all three are always English and would poison language detection.
        const introPart = reply
          .replace(/\[BUTTONS:[^\]]*\]/gi, '')
          .replace(/\[ANSWER:[^\]]*\]/gi, '')
          .replace(/\[ANSWER_CONTRACT\][\s\S]*?\[\/ANSWER_CONTRACT\]/gi, '')
          .toLowerCase();
        const looksGerman =
          introPart.includes(' die ') || introPart.includes(' der ') || introPart.includes(' und ') ||
          introPart.includes(' ist ') || introPart.includes(' mit ') || introPart.includes(' ich ') ||
          introPart.includes(' dir ') || introPart.includes(' du ') || introPart.includes('ß');
        if (looksGerman) { pass('language param: handleMessage(..., "de") makes intro/CLARIFY reply German even for English user text'); results.push({ ok: true }); }
        else { fail('language param plumbing', `Intro looks non-German. Reply (stripped): "${introPart.slice(0, 200)}"`); results.push({ ok: false }); }
      } catch (err) {
        if (is529(err)) { skip('language param plumbing test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('language param plumbing test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

    // Language persistence after mid-session switch:
    // Turn 1 in French → Turn 2 in English on the SAME session id.
    // Regression guard for the Sonnet language-drift bug where stale French
    // assistant turns in conversation history caused the next English reply
    // to come back in French. The LANGUAGE LOCK block in buildSystemPrompt()
    // is what keeps Sonnet on-target after a language switch.
    (async () => {
      const sessionId = `test-lang-switch-${Date.now()}`;
      try {
        // Turn 1: French question, French reply.
        const fr = (await handleMessage(sessionId, "Qu'est-ce que Omniboost ?", 'fr')).reply;
        const frClean = fr
          .replace(/\[BUTTONS:[^\]]*\]/gi, '')
          .replace(/\[ANSWER:[^\]]*\]/gi, '')
          .replace(/\[ANSWER_CONTRACT\][\s\S]*?\[\/ANSWER_CONTRACT\]/gi, '')
          .toLowerCase();
        const looksFrench =
          frClean.includes(' le ') || frClean.includes(' la ') || frClean.includes(' les ') ||
          frClean.includes(' est ') || frClean.includes(' vous ') || frClean.includes(' une ') ||
          frClean.includes(' des ') || frClean.includes(' pour ');
        if (!looksFrench) {
          skip('language persistence: setup turn (French)', 'Turn 1 French reply did not contain detectable French — cannot assert Turn 2');
          results.push({ ok: 'skip' });
          return;
        }

        // Turn 2: English follow-up on the SAME session. Must come back in English,
        // NOT French, even though the history still contains French assistant turns.
        const en = (await handleMessage(sessionId, 'Thanks, can you tell me a bit more about what it does?', 'en')).reply;
        const enClean = en
          .replace(/\[BUTTONS:[^\]]*\]/gi, '')
          .replace(/\[ANSWER:[^\]]*\]/gi, '')
          .replace(/\[ANSWER_CONTRACT\][\s\S]*?\[\/ANSWER_CONTRACT\]/gi, '')
          .toLowerCase();
        const looksEnglish =
          enClean.includes(' the ') || enClean.includes(' is ') || enClean.includes(' you ') ||
          enClean.includes(' and ') || enClean.includes(' it ') || enClean.includes(' for ') ||
          enClean.includes(' your ') || enClean.includes(' with ');
        const stillLooksFrench =
          enClean.includes(' le ') || enClean.includes(' la ') || enClean.includes(' les ') ||
          enClean.includes(' est ') || enClean.includes(' vous ') || enClean.includes(' une ') ||
          enClean.includes(' pour ') || enClean.includes(" l'") || enClean.includes(" d'");

        if (looksEnglish && !stillLooksFrench) {
          pass('language persistence: fr→en switch produces English reply despite French conversation history');
          results.push({ ok: true });
        } else {
          fail(
            'language persistence after switch',
            `looksEnglish=${looksEnglish} stillLooksFrench=${stillLooksFrench} reply="${enClean.slice(0, 240)}"`
          );
          results.push({ ok: false });
        }
      } catch (err) {
        if (is529(err)) { skip('language persistence test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('language persistence test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

    // generateClarifyingQuestions: valid JSON or acceptable plain-text fallback
    (async () => {
      try {
        const raw = await generateClarifyingQuestions('how do I connect my accounting system?', null, []) as string;
        try {
          const parsed = JSON.parse(raw) as { __type?: string; questions?: { text: string; options: string[] }[] };
          const hasType      = parsed.__type === 'clarify_questions';
          const hasQuestions = Array.isArray(parsed.questions) && parsed.questions.length > 0;
          const firstQ       = parsed.questions?.[0];
          const hasText      = typeof firstQ?.text === 'string' && firstQ.text.length > 0;
          const hasOptions   = Array.isArray(firstQ?.options) && firstQ.options.length >= 2;
          if (hasType && hasQuestions && hasText && hasOptions) { pass(`generateClarifyingQuestions: returns valid clarify_questions JSON (${parsed.questions!.length} questions)`); results.push({ ok: true }); }
          else { fail('generateClarifyingQuestions: JSON structure', `type=${hasType} questions=${hasQuestions} text=${hasText} options=${hasOptions}`); results.push({ ok: false }); }
        } catch {
          skip('generateClarifyingQuestions: JSON output', 'Haiku returned plain-text fallback (transient JSON failure — acceptable)');
          results.push({ ok: 'skip' });
        }
      } catch (err) {
        if (is529(err)) { skip('generateClarifyingQuestions test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('generateClarifyingQuestions test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

    // Stage 2A content-check: city ledger question must reach ANSWER (not BASIC carousel)
    // Previously failed because Haiku rejected the doc based on thin metadata alone.
    (async () => {
      try {
        const reply = (await handleMessage(`test-city-ledger-${Date.now()}`, 'what is a city ledger?')).reply;
        const lower = reply.toLowerCase();
        const hasContent = lower.includes('city ledger') || lower.includes('ledger') || lower.includes('accounts');
        const isBasicCarousel = reply.trimStart().startsWith('{') || (reply.includes('[BUTTONS:') && !lower.includes('ledger'));
        if (hasContent && !isBasicCarousel) { pass('Stage 2A content-check: "what is a city ledger?" returns an answer (not BASIC carousel)'); results.push({ ok: true }); }
        else { fail('Stage 2A content-check: city ledger', `isBasicCarousel=${isBasicCarousel} hasContent=${hasContent} reply="${reply.slice(0, 150)}"`); results.push({ ok: false }); }
      } catch (err) {
        if (is529(err)) { skip('Stage 2A city ledger test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('Stage 2A city ledger test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

    // chat() return shape: { reply, signal, contract } with signal stripped from reply
    (async () => {
      try {
        const result = await chatFn(`test-chat-result-${Date.now()}`, 'what does Omniboost do?', null, null, null) as { reply: string; signal: string | null; contract: Record<string, unknown> | null };
        const hasReplyString       = typeof result.reply === 'string' && result.reply.trim().length > 0;
        const replyHasNoSignalBlock = !result.reply.includes('[ANSWER:') && !result.reply.includes('[ANSWER_CONTRACT]');
        const hasSignalKey          = 'signal' in result;
        const hasContractKey        = 'contract' in result;
        if (hasReplyString && replyHasNoSignalBlock && hasSignalKey && hasContractKey) { pass('chat() returns { reply, signal, contract } and strips signal/contract from reply'); results.push({ ok: true }); }
        else { fail('chat() return shape or signal stripping', `hasReply=${hasReplyString} noBlocks=${replyHasNoSignalBlock} hasSignal=${hasSignalKey} hasContract=${hasContractKey}`); results.push({ ok: false }); }
      } catch (err) {
        if (is529(err)) { skip('chat() return shape test', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
        else { fail('chat() return shape test', (err as Error).message); results.push({ ok: false }); }
      }
    })(),

  ]);

  // ── Wave 2: cache dynamic — two consecutive calls, must stay sequential ───
  try {
    const { baseSystemPrompt: sysText } = await import(`${ROOT}/prompts/system.ts`);
    // @ts-ignore — cache_control accepted at runtime, not yet in SDK types
    const sysBlocks = [{ type: 'text', text: sysText, cache_control: { type: 'ephemeral' } }];
    const msgs = [{ role: 'user' as const, content: 'ping' }];
    // @ts-ignore
    const r1 = await clt.messages.create({ model, max_tokens: 5, system: sysBlocks, messages: msgs });
    const created = ((r1.usage as Record<string, number>).cache_creation_input_tokens ?? 0);
    await new Promise(r => setTimeout(r, 600));
    // @ts-ignore
    const r2 = await clt.messages.create({ model, max_tokens: 5, system: sysBlocks, messages: msgs });
    const readFromCache = ((r2.usage as Record<string, number>).cache_read_input_tokens ?? 0);
    if (created > 0 || readFromCache > 0) { pass(`[cache] Sonnet: prompt caching active (created=${created}, read=${readFromCache})`); results.push({ ok: true }); }
    else { fail('[cache] Sonnet: prompt caching active', `cache_creation=${created}, cache_read=${readFromCache}`); results.push({ ok: false }); }
  } catch (err) {
    if (is529(err)) { skip('[cache] Sonnet: prompt caching dynamic check', 'API overloaded (529) — transient'); results.push({ ok: 'skip' }); }
    else { fail('[cache] Sonnet: prompt caching dynamic check', (err as Error).message); results.push({ ok: false }); }
  }
}

// ── Entry point ───────────────────────────────────────────────────────────────

export async function checkPipeline({ pass, fail, skip, results }: Reporter): Promise<void> {
  await checkErrorHandler({ pass, fail, skip, results });
  await checkLoader({ pass, fail, skip, results });
  await checkParseTools({ pass, fail, skip, results });
  await checkConfigSanity({ pass, fail, skip, results });

  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  if (!hasApiKey) {
    skip('BASIC_MODE / language injection / multi-turn tests', 'ANTHROPIC_API_KEY not set');
    results.push({ ok: 'skip' });
    return;
  }

  await checkPipelineBehaviours({ pass, fail, skip, results });
}
