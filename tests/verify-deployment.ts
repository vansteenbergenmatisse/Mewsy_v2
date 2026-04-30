/**
 * verify-deployment.ts — Post-deployment SSL + endpoint smoke test.
 * Run AFTER DNS is pointed at Railway and the cert is issued.
 *
 * Usage:
 *   tsx tests/verify-deployment.ts
 *   tsx tests/verify-deployment.ts https://custom-url.railway.app
 *
 * This file is TEMPORARY — delete after deployment is confirmed working.
 */

import * as tls from 'tls';
import * as https from 'https';

const TARGET = process.argv[2] || 'https://mewsie.omniboost.io';
const host = new URL(TARGET).hostname;

let passed = 0;
let failed = 0;

function ok(label: string) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label: string, detail: string) {
  console.error(`  ✗  ${label}`);
  console.error(`     ${detail}`);
  failed++;
}

function request(path: string, options: https.RequestOptions = {}): Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(`${TARGET}${path}`);
    const req = https.request({ hostname: parsed.hostname, port: 443, path: parsed.pathname, rejectUnauthorized: true, ...options }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers as Record<string, string | string[] | undefined>, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

function get(path: string) { return request(path, { method: 'GET' }); }

async function checkSSL() {
  console.log('\n── Agent 1: SSL Certificate ─────────────────────────────────────');
  return new Promise<void>((resolve) => {
    const socket = tls.connect({ host, port: 443, servername: host }, () => {
      const cert = socket.getPeerCertificate(true);
      const now = Date.now();

      const validFrom = new Date(cert.valid_from).getTime();
      const validTo = new Date(cert.valid_to).getTime();

      if (now < validFrom) {
        fail('Cert not yet valid', `valid_from=${cert.valid_from}`);
      } else if (now > validTo) {
        fail('Cert EXPIRED', `expired=${cert.valid_to}`);
      } else {
        const daysLeft = Math.floor((validTo - now) / 86400000);
        ok(`Cert valid (${daysLeft} days remaining, expires ${cert.valid_to})`);
      }

      const cn: string = (cert.subject as { CN?: string })?.CN ?? '';
      const sans: string[] = (cert.subjectaltname ?? '').split(', ').map((s: string) => s.replace('DNS:', ''));
      const matches = cn === host || sans.some(san => san === host || (san.startsWith('*.') && host.endsWith(san.slice(1))));

      if (matches) {
        ok(`Cert CN/SAN matches ${host} (CN=${cn})`);
      } else {
        fail(`Cert CN/SAN does NOT match ${host}`, `CN=${cn}, SANs=${sans.join(', ')}`);
      }

      socket.end();
      resolve();
    });
    socket.on('error', (err) => {
      fail('TLS handshake failed', err.message);
      resolve();
    });
  });
}

async function checkEndpoints() {
  console.log('\n── Agent 2: Endpoint Reachability ───────────────────────────────');

  try {
    const health = await get('/health');
    if (health.status === 200) {
      ok(`GET /health → ${health.status}`);
    } else {
      fail('GET /health returned non-200', `status=${health.status}`);
    }
    const parsed = JSON.parse(health.body);
    if (parsed?.status === 'ok') {
      ok('GET /health body: { status: "ok" }');
    } else {
      fail('GET /health body unexpected', health.body.slice(0, 100));
    }
  } catch (err) {
    fail('GET /health threw', (err as Error).message);
  }

  try {
    const loader = await get('/embed/mewsie-loader.js');
    if (loader.status === 200) {
      ok(`GET /embed/mewsie-loader.js → ${loader.status}`);
    } else {
      fail('GET /embed/mewsie-loader.js returned non-200', `status=${loader.status}`);
    }
    const ct = String(loader.headers['content-type'] ?? '');
    if (ct.includes('javascript') || ct.includes('application/js')) {
      ok(`Content-Type is JS (${ct})`);
    } else {
      fail('Unexpected Content-Type for loader', ct);
    }
    if (loader.body.includes('MewsieEmbed')) {
      ok('Response body contains MewsieEmbed');
    } else {
      fail('Response body does not contain MewsieEmbed', loader.body.slice(0, 100));
    }
  } catch (err) {
    fail('GET /embed/mewsie-loader.js threw', (err as Error).message);
  }
}

async function checkCORS() {
  console.log('\n── Agent 3: CORS Headers ─────────────────────────────────────────');

  const baseOrigins = ['https://mewsie.omniboost.io'];
  for (const origin of baseOrigins) {
    try {
      const res = await request('/webhook/chat', {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });
      const acao = String(res.headers['access-control-allow-origin'] ?? '');
      if (acao === origin || acao === '*') {
        ok(`CORS allows origin ${origin} (acao=${acao})`);
      } else {
        fail(`CORS blocked for ${origin}`, `access-control-allow-origin: "${acao}"`);
      }
    } catch (err) {
      fail(`CORS check for ${origin} threw`, (err as Error).message);
    }
  }
}

async function main() {
  console.log(`\nVerifying deployment at: ${TARGET}\n`);
  await checkSSL();
  await checkEndpoints();
  await checkCORS();

  console.log(`\n${'─'.repeat(54)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error('\nDeployment verification FAILED. Check the items above.');
    process.exit(1);
  } else {
    console.log('\nAll checks passed. Deployment is healthy.');
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
