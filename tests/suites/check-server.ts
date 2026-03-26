/**
 * Suite 6: Server health
 * Starts the server briefly, hits /health, and shuts it down.
 * Also checks that the server rejects bad inputs.
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
  skip?: (label: string, reason: string) => void;
  results: TestResult[];
}

function wait(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)); }

async function fetchJson(url: string, options: RequestInit = {}): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function checkServer({ pass, fail, results }: Reporter): Promise<void> {
  const PORT = await getFreePort();
  const BASE = `http://localhost:${PORT}`;

  // Resolve tsx binary — prefer local node_modules/.bin for reliability
  const tsxBin = join(ROOT, 'node_modules', '.bin', 'tsx');

  // Start the server as a child process
  const server = spawn(tsxBin, ['backend/server.ts'], {
    cwd: ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
  });

  // Catch ENOENT / EACCES so the suite fails cleanly instead of crashing
  server.on('error', (err: Error) => startupErrors.push(err.message));

  let started = false;
  const startupErrors: string[] = [];
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
      body: JSON.stringify({ chatInput: 'a'.repeat(5000), sessionId: 'test' }),
    });
    if (huge.status === 400) {
      pass('POST /webhook/chat rejects input > 4000 chars with 400');
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

  } catch (err) {
    fail('server tests', (err as Error).message);
    results.push({ ok: false });
  } finally {
    server.kill();
    await wait(300); // Give it a moment to exit cleanly
  }
}
