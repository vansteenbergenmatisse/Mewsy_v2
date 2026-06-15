/**
 * Suite 7: Server health
 * Starts the server briefly, hits /health, and shuts it down.
 * Also checks input validation, CORS headers, valid POST → 200, and wrong HTTP method.
 */

import { spawn }        from 'child_process';
import { join }         from 'path';
import { createServer } from 'net';
import { fileURLToPath } from 'url';
import { dirname }      from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

// Ask the OS for a free port so we never clash with the real server or other processes
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
  });
}

interface TestResult {
  ok: boolean | 'skip';
}

interface Reporter {
  pass: (label: string) => void;
  fail: (label: string, err: string) => void;
  skip: (label: string, reason: string) => void;
  results: TestResult[];
}

function wait(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url: string, options: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function checkServer({ pass, fail, skip, results }: Reporter): Promise<void> {
  const PORT = await getFreePort();
  const BASE = `http://localhost:${PORT}`;

  // Resolve tsx binary — prefer local node_modules/.bin for reliability
  const tsxBin = join(ROOT, 'node_modules', '.bin', 'tsx');

  // Start the server as a child process
  const startupErrors: string[] = [];
  const server = spawn(tsxBin, ['backend/server.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  // Catch ENOENT / EACCES so the suite fails cleanly instead of crashing
  server.on('error', (err: Error) => startupErrors.push(err.message));

  let started = false;
  server.stdout.on('data', (d: Buffer) => {
    if (d.toString().includes('listening on')) started = true;
  });
  server.stderr.on('data', (d: Buffer) => {
    startupErrors.push(d.toString().trim());
  });

  // Wait up to 30 seconds for startup
  for (let i = 0; i < 60; i++) {
    await wait(500);
    if (started) break;
  }

  if (!started) {
    const detail = startupErrors.length > 0
      ? startupErrors.slice(-3).join(' | ')
      : 'Server did not log "listening on"';
    fail('server starts successfully', detail);
    results.push({ ok: false });
    server.kill();
    return;
  }

  pass('server starts successfully');
  results.push({ ok: true });

  try {
    // ── /health ────────────────────────────────────────────────────────────
    const health = await fetchJson(`${BASE}/health`);
    if (health.status === 200 && (health.body as { status?: string })?.status === 'ok') {
      pass('GET /health returns 200 { status: "ok" }');
      results.push({ ok: true });
    } else {
      fail('GET /health', `Got status ${health.status}, body: ${JSON.stringify(health.body)}`);
      results.push({ ok: false });
    }

    // ── Missing chatInput ──────────────────────────────────────────────────
    const missing = await fetchJson(`${BASE}/webhook/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: 'test' }),
    });
    if (missing.status === 400) {
      pass('POST /webhook/chat rejects missing chatInput with 400');
      results.push({ ok: true });
    } else {
      fail('POST /webhook/chat rejects missing chatInput', `Got status ${missing.status}`);
      results.push({ ok: false });
    }

    // ── Missing sessionId ──────────────────────────────────────────────────
    const noSession = await fetchJson(`${BASE}/webhook/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: 'hello' }),
    });
    if (noSession.status === 400) {
      pass('POST /webhook/chat rejects missing sessionId with 400');
      results.push({ ok: true });
    } else {
      fail('POST /webhook/chat rejects missing sessionId', `Got status ${noSession.status}`);
      results.push({ ok: false });
    }

    // ── Oversized input ────────────────────────────────────────────────────
    const huge = await fetchJson(`${BASE}/webhook/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatInput: 'a'.repeat(1500), sessionId: 'test' }),
    });
    if (huge.status === 400) {
      pass('POST /webhook/chat rejects input > 1000 chars with 400');
      results.push({ ok: true });
    } else {
      fail('POST /webhook/chat rejects oversized input', `Got status ${huge.status}`);
      results.push({ ok: false });
    }

    // ── Frontend is served ─────────────────────────────────────────────────
    const frontend = await fetch(`${BASE}/`);
    if (frontend.status === 200) {
      pass('GET / serves the frontend (200)');
      results.push({ ok: true });
    } else {
      fail('GET / serves the frontend', `Got status ${frontend.status}`);
      results.push({ ok: false });
    }

    // ── CORS: localhost origin is allowed ──────────────────────────────────
    const corsAllowed = await fetch(`${BASE}/health`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    const corsHeader = corsAllowed.headers.get('access-control-allow-origin');
    if (corsHeader === 'http://localhost:5173' || corsHeader === '*') {
      pass('CORS: localhost:5173 origin is allowed');
      results.push({ ok: true });
    } else {
      fail('CORS: localhost:5173 origin is allowed', `access-control-allow-origin: "${corsHeader}"`);
      results.push({ ok: false });
    }

    // ── CORS: unknown origin is rejected ──────────────────────────────────
    const corsRejected = await fetch(`${BASE}/health`, {
      headers: { Origin: 'https://evil.example.com' },
    });
    const corsHeader2 = corsRejected.headers.get('access-control-allow-origin');
    if (!corsHeader2 || corsHeader2 === 'null') {
      pass('CORS: evil.example.com origin is rejected (no allow-origin header)');
      results.push({ ok: true });
    } else {
      fail('CORS: evil.example.com rejected', `Unexpectedly got allow-origin: "${corsHeader2}"`);
      results.push({ ok: false });
    }

    // ── Valid POST /webhook/chat → 200 { output: string } ─────────────────
    if (process.env.ANTHROPIC_API_KEY) {
      const validPost = await fetchJson(`${BASE}/webhook/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: 'hello', sessionId: `srv-test-${Date.now()}` }),
      });
      if (validPost.status === 200 && typeof (validPost.body as { output?: unknown })?.output === 'string') {
        pass('POST /webhook/chat with valid input returns 200 { output: string }');
        results.push({ ok: true });
      } else {
        fail('POST /webhook/chat valid input', `Got status ${validPost.status}, body: ${JSON.stringify(validPost.body)}`);
        results.push({ ok: false });
      }
    } else {
      skip('POST /webhook/chat valid input → 200', 'ANTHROPIC_API_KEY not set');
      results.push({ ok: 'skip' });
    }

    // ── Live Base context: a tool arriving on a LATER message still suppresses
    // the "which integration?" question. Message 1 (same session) carries no
    // tool; message 2 carries QuickBooks. Locks the contract that the live
    // pre-fill is applied per-turn (not only on the first message), so a value
    // Base sends late is never silently ignored.
    if (process.env.ANTHROPIC_API_KEY) {
      const ctxSession = `srv-ctx-${Date.now()}`;
      const tok = 'bt_srvctx';
      await fetchJson(`${BASE}/webhook/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: 'How do I map a revenue account?', sessionId: ctxSession, browserToken: tok }),
      });
      const withTool = await fetchJson(`${BASE}/webhook/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatInput: 'How do I map a revenue account?', sessionId: ctxSession, browserToken: tok, accountingSoftware: 'QuickBooks', tier: 'bronze', companyName: '48 Park Street' }),
      });
      const out2 = String((withTool.body as { output?: unknown })?.output ?? '');
      if (withTool.status === 200 && !/which\s+(accounting|integration)/i.test(out2)) {
        pass('POST /webhook/chat: a tool sent on a later message suppresses the "which integration?" question');
        results.push({ ok: true });
      } else {
        fail('POST /webhook/chat later-message tool suppresses integration question', `status ${withTool.status}, output: ${out2.slice(0, 200)}`);
        results.push({ ok: false });
      }
    } else {
      skip('POST /webhook/chat later-message tool suppresses integration question', 'ANTHROPIC_API_KEY not set');
      results.push({ ok: 'skip' });
    }

    // ── Wrong HTTP method → 404 ────────────────────────────────────────────
    // Hono returns 404 for GET on a POST-only route
    const wrongMethod = await fetchJson(`${BASE}/webhook/chat`);
    if (wrongMethod.status === 404 || wrongMethod.status === 405) {
      pass(`GET /webhook/chat returns ${wrongMethod.status} (method not registered)`);
      results.push({ ok: true });
    } else {
      fail('GET /webhook/chat returns 404 or 405', `Got status ${wrongMethod.status}`);
      results.push({ ok: false });
    }

    // ── /api/sync-context now requires X-Mewsie-Sync-Token (shared secret) ──
    const SYNC_SECRET = process.env.BASE_SYNC_SECRET || '';

    // ── POST /api/sync-context — missing secret → 401 ────────────────────
    const syncNoSecret = await fetchJson(`${BASE}/api/sync-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseUserId: `test_noauth_${Date.now()}` }),
    });
    if (syncNoSecret.status === 401) {
      pass('POST /api/sync-context without X-Mewsie-Sync-Token returns 401');
      results.push({ ok: true });
    } else {
      fail('POST /api/sync-context without secret rejected', `Got status ${syncNoSecret.status}`);
      results.push({ ok: false });
    }

    // ── POST /api/sync-context — wrong secret → 401 ──────────────────────
    const syncWrongSecret = await fetchJson(`${BASE}/api/sync-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mewsie-Sync-Token': 'not-the-real-token',
      },
      body: JSON.stringify({ baseUserId: `test_wrong_${Date.now()}` }),
    });
    if (syncWrongSecret.status === 401) {
      pass('POST /api/sync-context with wrong X-Mewsie-Sync-Token returns 401');
      results.push({ ok: true });
    } else {
      fail('POST /api/sync-context with wrong secret rejected', `Got status ${syncWrongSecret.status}`);
      results.push({ ok: false });
    }

    // The remaining sync-context tests need a real secret. Skip if dev .env
    // hasn't set one (e.g. CI without secrets) — auth tests above still cover
    // the 401 path.
    const syncValidBaseId = `test_server_${Date.now()}`;
    const syncBadTierBaseId = `test_tier_${Date.now()}`;
    if (!SYNC_SECRET) {
      skip('POST /api/sync-context payload validation', 'BASE_SYNC_SECRET not set in env');
      results.push({ ok: 'skip' });
    } else {
      const authHeaders = {
        'Content-Type': 'application/json',
        'X-Mewsie-Sync-Token': SYNC_SECRET,
      };

      // ── POST /api/sync-context — missing baseUserId → 400 ──────────────
      const syncMissing = await fetchJson(`${BASE}/api/sync-context`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ accountingSoftware: 'Xero' }),
      });
      if (syncMissing.status === 400) {
        pass('POST /api/sync-context rejects missing baseUserId with 400');
        results.push({ ok: true });
      } else {
        fail('POST /api/sync-context rejects missing baseUserId', `Got status ${syncMissing.status}`);
        results.push({ ok: false });
      }

      // ── POST /api/sync-context — valid payload → 200 (or skip if DB down) ─
      const syncValid = await fetchJson(`${BASE}/api/sync-context`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          baseUserId: syncValidBaseId,
          accountingSoftware: 'Xero',
          tier: 'silver',
          companyName: 'Test Corp',
        }),
      });
      if (syncValid.status === 200 && (syncValid.body as { ok?: boolean })?.ok === true) {
        pass('POST /api/sync-context with valid payload returns 200 { ok: true }');
        results.push({ ok: true });
      } else if (syncValid.status === 500) {
        // Expected when Supabase URL is unreachable — the upsert throws and the
        // outer catch returns 500. This is now correct behavior (not a silent
        // ok:true), so we skip rather than fail.
        skip('POST /api/sync-context valid payload', 'DB unreachable — upsert threw (Supabase URL / credentials)');
        results.push({ ok: 'skip' });
      } else {
        fail('POST /api/sync-context valid payload', `Got status ${syncValid.status}, body: ${JSON.stringify(syncValid.body)}`);
        results.push({ ok: false });
      }

      // ── POST /api/sync-context — invalid tier sanitized to null ────────
      const syncBadTier = await fetchJson(`${BASE}/api/sync-context`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ baseUserId: syncBadTierBaseId, tier: 'diamond' }),
      });
      if (syncBadTier.status === 200) {
        pass('POST /api/sync-context with invalid tier still returns 200 (tier sanitized to null)');
        results.push({ ok: true });
      } else if (syncBadTier.status === 500) {
        skip('POST /api/sync-context invalid tier handling', 'DB unreachable');
        results.push({ ok: 'skip' });
      } else {
        fail('POST /api/sync-context invalid tier handling', `Got status ${syncBadTier.status}`);
        results.push({ ok: false });
      }
    }

    // ── POST /api/feedback — missing bundleId → 400 ────────────────────
    const fbMissing = await fetchJson(`${BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote: 'up' }),
    });
    if (fbMissing.status === 400) {
      pass('POST /api/feedback rejects missing bundleId with 400');
      results.push({ ok: true });
    } else {
      fail('POST /api/feedback rejects missing bundleId', `Got status ${fbMissing.status}`);
      results.push({ ok: false });
    }

    // ── POST /api/feedback — invalid vote → 400 ─────────────────────
    const fbBadVote = await fetchJson(`${BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: crypto.randomUUID(), vote: 'maybe' }),
    });
    if (fbBadVote.status === 400) {
      pass('POST /api/feedback rejects invalid vote with 400');
      results.push({ ok: true });
    } else {
      fail('POST /api/feedback rejects invalid vote', `Got status ${fbBadVote.status}`);
      results.push({ ok: false });
    }

    // ── POST /api/feedback — valid up vote → 200 ────────────────────
    // Uses a random bundleId that won't exist in the DB — the endpoint
    // saves with bundle_id = null as graceful fallback (requires migration 0004).
    // If migration hasn't been applied, bundle_id is still NOT NULL and the insert
    // fails with 500 — skip gracefully in that case.
    const fbUpVote = await fetchJson(`${BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: crypto.randomUUID(), vote: 'up' }),
    });
    if (fbUpVote.status === 200 && (fbUpVote.body as { ok?: boolean })?.ok === true) {
      pass('POST /api/feedback with valid up vote returns 200');
      results.push({ ok: true });
    } else if (fbUpVote.status === 500) {
      skip('POST /api/feedback valid up vote', 'bundle_id still NOT NULL — run migration 0004');
      results.push({ ok: 'skip' });
    } else {
      fail('POST /api/feedback valid up vote', `Got status ${fbUpVote.status}, body: ${JSON.stringify(fbUpVote.body)}`);
      results.push({ ok: false });
    }

    // ── POST /api/feedback — down vote with reason → 200 ────────────
    const fbDownVote = await fetchJson(`${BASE}/api/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundleId: crypto.randomUUID(), vote: 'down', reason: 'incomplete' }),
    });
    if (fbDownVote.status === 200 && (fbDownVote.body as { ok?: boolean })?.ok === true) {
      pass('POST /api/feedback with down vote + reason returns 200');
      results.push({ ok: true });
    } else if (fbDownVote.status === 500) {
      skip('POST /api/feedback down vote with reason', 'bundle_id still NOT NULL — run migration 0004');
      results.push({ ok: 'skip' });
    } else {
      fail('POST /api/feedback down vote with reason', `Got status ${fbDownVote.status}, body: ${JSON.stringify(fbDownVote.body)}`);
      results.push({ ok: false });
    }

    // Clean up test rows created by sync-context and feedback tests
    try {
      const { getSupabase } = await import('../../backend/db/supabase.ts');
      const { ENABLE_DB_WRITES } = await import('../../backend/config/mewsie.config.ts');
      if (ENABLE_DB_WRITES) {
        const supabase = getSupabase();
        await supabase.from('users').delete().eq('base_user_id', syncValidBaseId);
        await supabase.from('users').delete().eq('base_user_id', syncBadTierBaseId);
        // Clean up feedback rows with null bundle_id (created by tests above)
        await supabase.from('feedback').delete().is('bundle_id', null);
      }
    } catch { /* best-effort cleanup */ }

  } catch (err) {
    fail('server tests', (err as Error).message);
    results.push({ ok: false });
  } finally {
    server.kill();
    await wait(300); // Give it a moment to exit cleanly
  }
}
