/**
 * Suite 11: Database layer
 * Tests PII scrubber, TurnBuffer structure, and ENABLE_DB_WRITES flag.
 * No actual Supabase connection needed — these are unit tests.
 */

import { scrubPII } from '../../backend/db/pii-scrubber.ts';
import { TurnBuffer } from '../../backend/db/turn-buffer.ts';

interface TestResult {
  ok: boolean | 'skip';
}

interface Reporter {
  pass: (label: string) => void;
  fail: (label: string, err: string) => void;
  skip: (label: string, reason: string) => void;
  results: TestResult[];
}

export async function checkDb({ pass, fail, skip, results }: Reporter): Promise<void> {
  // ── PII Scrubber ──────────────────────────────────────────────────────────

  // Email redaction
  {
    const input = 'Contact me at john.doe@example.com for help';
    const output = scrubPII(input);
    if (output.includes('[EMAIL_REDACTED]') && !output.includes('john.doe@example.com')) {
      pass('scrubPII redacts email addresses');
      results.push({ ok: true });
    } else {
      fail('scrubPII redacts email addresses', `Got: ${output}`);
      results.push({ ok: false });
    }
  }

  // Phone redaction
  {
    const input = 'Call me at +31 6 12345678 please';
    const output = scrubPII(input);
    if (output.includes('[PHONE_REDACTED]')) {
      pass('scrubPII redacts phone numbers');
      results.push({ ok: true });
    } else {
      fail('scrubPII redacts phone numbers', `Got: ${output}`);
      results.push({ ok: false });
    }
  }

  // Credit card redaction
  {
    const input = 'My card is 4111 1111 1111 1111';
    const output = scrubPII(input);
    if (output.includes('[CARD_REDACTED]') && !output.includes('4111')) {
      pass('scrubPII redacts credit card numbers');
      results.push({ ok: true });
    } else {
      fail('scrubPII redacts credit card numbers', `Got: ${output}`);
      results.push({ ok: false });
    }
  }

  // IBAN redaction
  {
    const input = 'Transfer to NL91 ABNA 0417 1643 00';
    const output = scrubPII(input);
    if (output.includes('[IBAN_REDACTED]')) {
      pass('scrubPII redacts IBAN numbers');
      results.push({ ok: true });
    } else {
      fail('scrubPII redacts IBAN numbers', `Got: ${output}`);
      results.push({ ok: false });
    }
  }

  // No PII — text unchanged
  {
    const input = 'How do I set up GL mapping in Xero?';
    const output = scrubPII(input);
    if (output === input) {
      pass('scrubPII leaves clean text unchanged');
      results.push({ ok: true });
    } else {
      fail('scrubPII leaves clean text unchanged', `Got: ${output}`);
      results.push({ ok: false });
    }
  }

  // ���─ TurnBuffer structure ──────────────────────────────────────────────────

  // TurnBuffer opens a bundle with a UUID
  {
    const buffer = new TurnBuffer('test-conv-id');
    const bundleId = buffer.openBundle('How do I set up Xero?');
    if (typeof bundleId === 'string' && bundleId.length > 0) {
      pass('TurnBuffer.openBundle() returns a bundle ID string');
      results.push({ ok: true });
    } else {
      fail('TurnBuffer.openBundle() returns a bundle ID string', `Got: ${bundleId}`);
      results.push({ ok: false });
    }
  }

  // TurnBuffer.currentBundleId tracks the open bundle
  {
    const buffer = new TurnBuffer('test-conv-id');
    if (buffer.currentBundleId === null) {
      pass('TurnBuffer.currentBundleId is null before openBundle()');
      results.push({ ok: true });
    } else {
      fail('TurnBuffer.currentBundleId is null before openBundle()', `Got: ${buffer.currentBundleId}`);
      results.push({ ok: false });
    }

    const id = buffer.openBundle('test question');
    if (buffer.currentBundleId === id) {
      pass('TurnBuffer.currentBundleId matches after openBundle()');
      results.push({ ok: true });
    } else {
      fail('TurnBuffer.currentBundleId matches after openBundle()', `Got: ${buffer.currentBundleId}`);
      results.push({ ok: false });
    }
  }

  // TurnBuffer.addMessage does not throw
  {
    const buffer = new TurnBuffer('test-conv-id');
    buffer.openBundle('test');
    try {
      buffer.addMessage('user', 'hello');
      buffer.addMessage('bot', 'hi there');
      pass('TurnBuffer.addMessage() accepts user and bot roles');
      results.push({ ok: true });
    } catch (err) {
      fail('TurnBuffer.addMessage() accepts user and bot roles', (err as Error).message);
      results.push({ ok: false });
    }
  }

  // TurnBuffer.log writes to stdout (does not throw)
  {
    const buffer = new TurnBuffer('test-conv-id');
    buffer.openBundle('test');
    try {
      buffer.log('info', 'stage1', 'test log message');
      buffer.log('warn', 'routing', 'test warning');
      pass('TurnBuffer.log() does not throw');
      results.push({ ok: true });
    } catch (err) {
      fail('TurnBuffer.log() does not throw', (err as Error).message);
      results.push({ ok: false });
    }
  }

  // TurnBuffer.flush() is a no-op when ENABLE_DB_WRITES is false
  {
    const buffer = new TurnBuffer('test-conv-id');
    buffer.openBundle('test');
    buffer.addMessage('user', 'test');
    try {
      await buffer.flush(); // Should not throw — ENABLE_DB_WRITES defaults to false
      pass('TurnBuffer.flush() is a no-op when ENABLE_DB_WRITES=false');
      results.push({ ok: true });
    } catch (err) {
      fail('TurnBuffer.flush() is a no-op when ENABLE_DB_WRITES=false', (err as Error).message);
      results.push({ ok: false });
    }
  }

  // ── ENABLE_DB_WRITES flag ─────────────────────────────────────────────────

  {
    const { ENABLE_DB_WRITES } = await import('../../backend/config/mewsie.config.ts');
    if (typeof ENABLE_DB_WRITES === 'boolean') {
      pass('ENABLE_DB_WRITES is a boolean');
      results.push({ ok: true });
    } else {
      fail('ENABLE_DB_WRITES is a boolean', `Got type: ${typeof ENABLE_DB_WRITES}`);
      results.push({ ok: false });
    }
  }
}
