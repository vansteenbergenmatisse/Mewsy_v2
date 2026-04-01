/**
 * Suite 5: Chat integration
 * Runs full end-to-end handleMessage() calls and validates the responses.
 * Requires a live ANTHROPIC_API_KEY.
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

interface ChatTest {
  description: string;
  message: string;
  mustContain: string[];
  mustNotContain: string[];
  customCheck?: (reply: string) => boolean;
}

const CHAT_TESTS: ChatTest[] = [
  {
    description: 'Tier question gets a real answer (not BASIC_MODE)',
    message:     'what are the bronze silver and gold tiers?',
    mustContain: ['bronze', 'silver', 'gold'],
    mustNotContain: ['outside what i cover', "don't have documentation"],
  },
  {
    description: 'Omniboost overview returns product info',
    message:     'what does omniboost do?',
    mustContain: ['omniboost'],
    mustNotContain: ["outside what i cover"],
  },
  {
    description: 'GL mapping question answers from docs',
    message:     'how does GL mapping work in mews?',
    mustContain: ['ledger', 'accounting'],
    mustNotContain: ["outside what i cover"],
  },
  {
    description: 'Out-of-scope question is handled gracefully (no guessing)',
    message:     'what is the capital of France?',
    mustNotContain: ['paris'],
    mustContain:    [],   // just check it doesn't hallucinate
  },
  {
    description: 'Response is non-empty string',
    message:     'hello',
    mustContain: [],
    mustNotContain: [],
    customCheck: (reply) => typeof reply === 'string' && reply.trim().length > 0,
  },
];

export async function checkChat({ pass, fail, skip: _skip, results }: Reporter): Promise<void> {
  const { handleMessage } = await import(`${ROOT}/backend/pipeline/agent.ts`);

  for (const tc of CHAT_TESTS) {
    try {
      await new Promise(r => setTimeout(r, 1500));
      const sessionId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const reply = await handleMessage(sessionId, tc.message) as string;
      const replyLower = reply.toLowerCase();

      let ok = true;
      const issues: string[] = [];

      // Custom check
      if (tc.customCheck && !tc.customCheck(reply)) {
        ok = false;
        issues.push('custom check failed');
      }

      // mustContain
      for (const word of tc.mustContain) {
        if (!replyLower.includes(word.toLowerCase())) {
          ok = false;
          issues.push(`reply missing "${word}"`);
        }
      }

      // mustNotContain
      for (const word of tc.mustNotContain) {
        if (replyLower.includes(word.toLowerCase())) {
          ok = false;
          issues.push(`reply should not contain "${word}"`);
        }
      }

      if (ok) {
        pass(`${tc.description}`);
        results.push({ ok: true });
      } else {
        fail(`${tc.description}`, issues.join(', '));
        results.push({ ok: false });
      }
    } catch (err) {
      fail(`${tc.description}`, (err as Error).message);
      results.push({ ok: false });
    }
  }

  // ── Multi-turn: context carries across messages ────────────────────────────
  try {
    const multiSid = `test-multiturn-chat-${Date.now()}`;
    await handleMessage(multiSid, 'tell me about the bronze tier');
    // Brief pause between calls to avoid triggering 529 overload on rapid bursts
    await new Promise(r => setTimeout(r, 2000));
    const reply2 = await handleMessage(multiSid, 'what about the silver tier?') as string;
    if (reply2.toLowerCase().includes('silver')) {
      pass('multi-turn: follow-up "what about silver?" returns silver-related content');
      results.push({ ok: true });
    } else {
      fail('multi-turn silver follow-up', `Reply did not contain "silver": "${reply2.slice(0, 200)}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('multi-turn silver follow-up', (err as Error).message);
    results.push({ ok: false });
  }

  // ── Em-dash absence: responses must never contain — ───────────────────────
  try {
    const emDashSid = `test-emdash-${Date.now()}`;
    const emDashReply = await handleMessage(emDashSid, 'what are the integration tiers?') as string;
    if (!emDashReply.includes('—')) {
      pass('response does not contain em-dash character (—)');
      results.push({ ok: true });
    } else {
      fail('em-dash absent from response', `Found — in: "${emDashReply.slice(0, 200)}"`);
      results.push({ ok: false });
    }
  } catch (err) {
    fail('em-dash absence test', (err as Error).message);
    results.push({ ok: false });
  }
}
