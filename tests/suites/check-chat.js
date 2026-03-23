/**
 * Suite 5: Chat integration
 * Runs full end-to-end handleMessage() calls and validates the responses.
 * Requires a live ANTHROPIC_API_KEY.
 */

import { join } from 'path';

const ROOT = join(import.meta.dirname, '../..');

const CHAT_TESTS = [
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

export async function checkChat({ pass, fail, skip, results }) {
  const { handleMessage } = await import(`${ROOT}/backend/pipeline/agent.js`);

  for (const tc of CHAT_TESTS) {
    try {
      const sessionId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const reply = await handleMessage(sessionId, tc.message);
      const replyLower = reply.toLowerCase();

      let ok = true;
      const issues = [];

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
      fail(`${tc.description}`, err.message);
      results.push({ ok: false });
    }
  }
}
