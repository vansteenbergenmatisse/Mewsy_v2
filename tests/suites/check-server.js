/**
 * Suite 6: Server health
 * Starts the server briefly, hits /health, and shuts it down.
 * Also checks that the server rejects bad inputs.
 */

import { spawn, execSync } from 'child_process';
import { join }  from 'path';

const ROOT    = join(import.meta.dirname, '../..');
const PORT    = process.env.PORT ?? 4010;
const BASE    = `http://localhost:${PORT}`;

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function freePort(port) {
  try {
    const pids = execSync(`lsof -ti :${port}`, { encoding: 'utf8' }).trim();
    if (pids) {
      execSync(`kill -9 ${pids.split('\n').join(' ')}`, { stdio: 'ignore' });
    }
  } catch { /* nothing on the port, that's fine */ }
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

export async function checkServer({ pass, fail, results }) {
  // Kill any process already holding the port so our new server can bind
  freePort(PORT);

  // Start the server as a child process
  const server = spawn('node', ['backend/server.js'], {
    cwd: ROOT,
    env: { ...process.env },
    stdio: 'pipe',
  });

  let started = false;
  server.stdout.on('data', (d) => {
    if (d.toString().includes('listening on')) started = true;
  });

  // Wait up to 30 seconds for startup
  for (let i = 0; i < 60; i++) {
    await wait(500);
    if (started) break;
  }

  if (!started) {
    fail('server starts within 30 seconds', 'Server did not log "listening on"');
    results.push({ ok: false });
    server.kill();
    return;
  }

  pass('server starts successfully');
  results.push({ ok: true });

  try {
    // ── /health ────────────────────────────────────────────────────────────
    const health = await fetchJson(`${BASE}/health`);
    if (health.status === 200 && health.body?.status === 'ok') {
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
    fail('server tests', err.message);
    results.push({ ok: false });
  } finally {
    server.kill();
    await wait(300); // Give it a moment to exit cleanly
  }
}
