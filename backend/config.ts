/**
 * config.ts
 *
 * Loads environment variables from the .env file and exports them as named
 * constants. Every other file imports from here instead of reading
 * process.env directly, so there is one single place to check what
 * the server needs to run.
 *
 * Required variables (the server warns at startup if any are missing):
 *   ANTHROPIC_API_KEY — your Anthropic API key, used by claude.ts
 *
 * Optional variables:
 *   PORT — which port the server listens on (default: 4010)
 */

// Only load .env file in local development — in production (Railway) all
// environment variables are injected directly and must not be overridden.
import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export const ANTHROPIC_API_KEY: string | undefined = process.env.ANTHROPIC_API_KEY;

// Railway injects PORT at runtime — fall back to 4010 for local dev
export const PORT: number = parseInt(process.env.PORT || '4010', 10);

// Warn at startup if the API key is missing — the server will start but
// every chat request will fail without it
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[config] WARNING: ANTHROPIC_API_KEY is not set');
}
