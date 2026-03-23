/**
 * server.js
 *
 * The entry point for Mewsy. This file starts the HTTP server and wires
 * everything together. It has two jobs:
 *   1. Serve the frontend (the chat widget) as a static website
 *   2. Accept incoming chat messages via POST /webhook/chat and return answers
 *
 * Flow for every chat message:
 *   Browser → POST /webhook/chat → agent.js → claude.js → response back to browser
 */

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { loadAllDocuments } from './fetch/loader.js';
import { handleMessage } from './pipeline/agent.js';
import { handlePipelineError, ErrorTypes } from './errors/errorHandler.js';

// __dirname is not available in ES modules by default — this reconstructs it
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

// Allow localhost in dev and the production domain set via ALLOWED_ORIGIN env var
const allowedOrigin = process.env.ALLOWED_ORIGIN || null;
app.use(cors({
  origin: (origin, cb) => {
    const isLocalhost = !origin || /^https?:\/\/localhost(:\d+)?$/.test(origin);
    const isProduction = allowedOrigin && origin === allowedOrigin;
    cb(isLocalhost || isProduction ? null : new Error('CORS blocked'), isLocalhost || isProduction);
  },
}));

// Limit each IP to 60 requests per minute on the chat endpoint — prevents API abuse
const chatRateLimit = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { output: 'Too many requests — please slow down.' },
});

// Parse incoming JSON request bodies, capped at 32kb to block oversized payloads
app.use(express.json({ limit: '32kb' }));

// Serve everything in the frontend/ folder as static files.
// Opening http://localhost:3000 in the browser will load frontend/index.html.
// No-cache headers ensure the browser always loads the latest files during development.
app.use(express.static(join(__dirname, '../frontend'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-store');
  },
}));

// If the Anthropic API takes longer than 30 seconds, give up and return an error.
// This prevents the browser from hanging forever on a slow response.
const ROUTE_TIMEOUT_MS = 30_000;

// ── POST /webhook/chat ─────────────────────────────────────────────────────────
// The only endpoint the frontend calls. Receives a chat message and returns
// Mewsy's reply. Both chatInput (the message text) and sessionId (which
// conversation this belongs to) are required.

app.post('/webhook/chat', chatRateLimit, async (req, res) => {
  // Start the 30-second countdown. If handleMessage hasn't finished by then,
  // send a timeout error so the browser doesn't wait forever.
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(504).json({ output: 'The request timed out. Please try again.' });
    }
  }, ROUTE_TIMEOUT_MS);

  try {
    const { chatInput, sessionId } = req.body;

    // Validate that both required fields are present and are strings
    if (!chatInput || typeof chatInput !== 'string') {
      clearTimeout(timeout);
      return res.status(400).json({ output: 'chatInput is required.' });
    }
    if (chatInput.length > 4000) {
      clearTimeout(timeout);
      return res.status(400).json({ output: 'Message too long — please keep it under 4000 characters.' });
    }
    if (!sessionId || typeof sessionId !== 'string') {
      clearTimeout(timeout);
      return res.status(400).json({ output: 'sessionId is required.' });
    }

    // Hand off to agent.js, which runs the full CAG pipeline and returns a reply
    const output = await handleMessage(sessionId, chatInput);
    clearTimeout(timeout);
    res.json({ output });
  } catch (err) {
    clearTimeout(timeout);
    const { chatInput, sessionId } = req.body ?? {};
    const userMessage = await handlePipelineError(err, {
      sessionId: sessionId ?? 'unknown',
      userMessage: chatInput ?? '',
      errorType: ErrorTypes.UNHANDLED,
    });
    if (!res.headersSent) {
      res.status(500).json({ output: userMessage });
    }
  }
});

// ── GET /health ────────────────────────────────────────────────────────────────
// Simple ping endpoint. Used to check if the server is running.
// Try it: curl http://localhost:3000/health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ── Startup ────────────────────────────────────────────────────────────────────
// Start listening immediately so health checks pass, then validate the
// knowledge manifest in the background. The manifest check is a sanity check
// only — it does not gate incoming traffic.
app.listen(PORT, () => {
  console.log(`[server] ${new Date().toISOString()} listening on http://localhost:${PORT}`);
  loadAllDocuments().catch((err) => {
    console.error(`[server] manifest check error: ${err.message}`);
  });
});
