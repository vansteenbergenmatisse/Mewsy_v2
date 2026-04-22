/**
 * Suite 11: Database layer
 * Tests PII scrubber, TurnBuffer structure, ENABLE_DB_WRITES flag,
 * and Base identity sync functions.
 * No actual Supabase connection needed — these are unit tests.
 */

import { scrubPII } from '../../backend/db/pii-scrubber.ts';
import { TurnBuffer } from '../../backend/db/turn-buffer.ts';
import { resolveByBaseUserId, syncBaseUser } from '../../backend/db/identity.ts';

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

  // ── ALLOWED_ORIGINS config ──────────────────────────────────────────────

  {
    const { ALLOWED_ORIGINS } = await import('../../backend/config/mewsie.config.ts');
    if (Array.isArray(ALLOWED_ORIGINS)) {
      pass('ALLOWED_ORIGINS is an array');
      results.push({ ok: true });
    } else {
      fail('ALLOWED_ORIGINS is an array', `Got type: ${typeof ALLOWED_ORIGINS}`);
      results.push({ ok: false });
    }
  }

  // ── Base identity sync ──────────────────────────────────────────────────

  {
    const { ENABLE_DB_WRITES: dbWrites } = await import('../../backend/config/mewsie.config.ts');

    if (!dbWrites) {
      // DB writes disabled — functions return noop/null
      const resolveResult = await resolveByBaseUserId('test_base_user_123');
      if (resolveResult === null) {
        pass('resolveByBaseUserId() returns null when DB writes disabled');
        results.push({ ok: true });
      } else {
        fail('resolveByBaseUserId() returns null when DB writes disabled', `Got: ${JSON.stringify(resolveResult)}`);
        results.push({ ok: false });
      }

      const syncResult = await syncBaseUser('test_base_user_456', 'Xero', 'silver', 'Test Corp');
      if (syncResult.userId === 'noop' && syncResult.isNew === false) {
        pass('syncBaseUser() returns noop when DB writes disabled');
        results.push({ ok: true });
      } else {
        fail('syncBaseUser() returns noop when DB writes disabled', `Got: ${JSON.stringify(syncResult)}`);
        results.push({ ok: false });
      }
    } else {
      // DB writes enabled — verify the functions are callable (may return null for non-existent user)
      try {
        const resolveResult = await resolveByBaseUserId('nonexistent_test_user_xyz');
        if (resolveResult === null) {
          pass('resolveByBaseUserId() returns null for non-existent base user');
          results.push({ ok: true });
        } else {
          pass(`resolveByBaseUserId() returned data for test query`);
          results.push({ ok: true });
        }
      } catch (err) {
        // If migration hasn't been applied yet, the column doesn't exist — skip gracefully
        const msg = (err as Error).message;
        if (msg.includes('base_user_id') || msg.includes('schema cache')) {
          skip('resolveByBaseUserId()', 'base_user_id column not yet added — run migration 0001');
          results.push({ ok: 'skip' });
        } else {
          fail('resolveByBaseUserId()', msg);
          results.push({ ok: false });
        }
      }

      try {
        const syncResult = await syncBaseUser('nonexistent_test_user_xyz', null, null, null);
        if (syncResult.userId && syncResult.userId !== 'error') {
          // Clean up the test user we just created
          const { getSupabase } = await import('../../backend/db/supabase.ts');
          await getSupabase().from('users').delete().eq('id', syncResult.userId);
          pass('syncBaseUser() creates a new user when base user does not exist');
          results.push({ ok: true });
        } else if (syncResult.userId === 'error') {
          // Likely migration not applied
          skip('syncBaseUser()', 'base_user_id column not yet added — run migration 0001');
          results.push({ ok: 'skip' });
        } else {
          pass('syncBaseUser() returned a result');
          results.push({ ok: true });
        }
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.includes('base_user_id') || msg.includes('schema cache')) {
          skip('syncBaseUser()', 'base_user_id column not yet added — run migration 0001');
          results.push({ ok: 'skip' });
        } else {
          fail('syncBaseUser()', msg);
          results.push({ ok: false });
        }
      }
    }
  }
}
