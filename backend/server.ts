/**
 * server.ts
 *
 * The entry point for Mewsy. This file starts the HTTP server and wires
 * everything together. It has two jobs:
 *   1. Serve the frontend (the chat widget) as a static website
 *   2. Accept incoming chat messages via POST /webhook/chat and return answers
 *
 * Flow for every chat message:
 *   Browser → POST /webhook/chat → agent.ts → claude.ts → response back to browser
 */

import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { rateLimiter } from 'hono-rate-limiter';
import { PORT } from './config.ts';
import { loadAllDocuments } from './fetch/loader.ts';
import { handleMessage } from './pipeline/agent.ts';
import { handlePipelineError, ErrorTypes } from './errors/errorHandler.ts';

const app = new Hono();

// Allow localhost in dev and the production domain set via ALLOWED_ORIGIN env var
const allowedOrigin = process.env.ALLOWED_ORIGIN || null;
app.use('*', cors({
  origin: (origin) => {
    const isLocalhost = !origin || /^https?:\/\/localhost(:\d+)?$/.test(origin);
    const isProduction = !!(allowedOrigin && origin === allowedOrigin);
    return isLocalhost || isProduction ? origin : null;
  },
}));

// Limit each IP to 60 requests per minute on the chat endpoint — prevents API abuse
const chatRateLimit = rateLimiter({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.raw.headers.get('x-real-ip') ?? 'unknown',
  message: { output: 'Too many requests — please slow down.' },
});

// If the Anthropic API takes longer than 30 seconds, give up and return an error.
// This prevents the browser from hanging forever on a slow response.
const ROUTE_TIMEOUT_MS = 30_000;

// ── POST /webhook/chat ─────────────────────────────────────────────────────────
// The only endpoint the frontend calls. Receives a chat message and returns
// Mewsy's reply. Both chatInput (the message text) and sessionId (which
// conversation this belongs to) are required.
app.post('/webhook/chat', chatRateLimit, async (c) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    const body = await c.req.json<{ chatInput?: unknown; sessionId?: unknown }>();
    const { chatInput, sessionId } = body;

    // Validate that both required fields are present and are strings
    if (!chatInput || typeof chatInput !== 'string') {
      return c.json({ output: 'chatInput is required.' }, 400);
    }
    if (chatInput.length > 4000) {
      return c.json({ output: 'Message too long — please keep it under 4000 characters.' }, 400);
    }
    if (!sessionId || typeof sessionId !== 'string') {
      return c.json({ output: 'sessionId is required.' }, 400);
    }

    // Hand off to agent.ts, which runs the full CAG pipeline and returns a reply
    const outputPromise = handleMessage(sessionId, chatInput);

    // Race between the pipeline and a 30-second timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), ROUTE_TIMEOUT_MS);
    });

    const output = await Promise.race([outputPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return c.json({ output });
  } catch (err) {
    if (timeoutId) clearTimeout(timeoutId);
    const error = err as Error;
    if (error.message === 'TIMEOUT') {
      return c.json({ output: 'The request timed out. Please try again.' }, 504);
    }
    const fallbackBody = await c.req.json<{ chatInput?: string; sessionId?: string }>().catch(() => ({ chatInput: '', sessionId: 'unknown' }));
    const userMessage = await handlePipelineError(error, {
      sessionId: fallbackBody.sessionId ?? 'unknown',
      userMessage: fallbackBody.chatInput ?? '',
      errorType: ErrorTypes.UNHANDLED,
    });
    return c.json({ output: userMessage }, 500);
  }
});

// ── GET /health ────────────────────────────────────────────────────────────────
// Simple ping endpoint. Used to check if the server is running.
// Try it: curl http://localhost:4010/health
app.get('/health', (c) => c.json({ status: 'ok' }));

// Serve everything in the frontend/dist/ folder as static files.
// No-cache headers ensure the browser always loads the latest files during development.
app.use('*', serveStatic({ root: './frontend/dist' }));

// ── Startup ────────────────────────────────────────────────────────────────────
// Start listening immediately so health checks pass, then validate the
// knowledge manifest in the background. The manifest check is a sanity check
// only — it does not gate incoming traffic.
serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, () => {
  console.log(`[server] ${new Date().toISOString()} listening on http://localhost:${PORT}`);
  loadAllDocuments().catch((err: Error) => {
    console.error(`[server] manifest check error: ${err.message}`);
  });
});
