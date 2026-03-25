// Central error handler for all pipeline failures.
// All errors route through here — never expose raw errors or stack traces to users.

import { sendSlackAlert, sendEmailAlert } from './alerts.ts';

const USER_FACING_MESSAGE = "Something went wrong on my end — please try again in a moment.";

// Context passed to handlePipelineError by the caller
interface ErrorContext {
  sessionId?: string;
  userMessage?: string;
  errorType?: string;
}

export async function handlePipelineError(error: unknown, context: ErrorContext = {}): Promise<string> {
  const { sessionId = 'unknown', userMessage = '', errorType = 'UNKNOWN' } = context;

  const logEntry = {
    timestamp: new Date().toISOString(),
    errorType,
    sessionId,
    userMessage: userMessage.slice(0, 200),
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? (error.stack ?? null) : null,
  };

  console.error('[MEWSY ERROR]', JSON.stringify(logEntry, null, 2));

  // Alert stubs — connect when credentials are available
  try {
    if (process.env.SLACK_WEBHOOK_URL) {
      await sendSlackAlert(logEntry);
    }
  } catch (alertErr) {
    console.error('[MEWSY] Slack alert failed:', (alertErr as Error).message);
  }

  try {
    if (process.env.ERROR_EMAIL) {
      await sendEmailAlert(logEntry);
    }
  } catch (alertErr) {
    console.error('[MEWSY] Email alert failed:', (alertErr as Error).message);
  }

  return USER_FACING_MESSAGE;
}

export const ErrorTypes = {
  TOKEN_LIMIT: 'TOKEN_LIMIT',
  RATE_LIMIT: 'RATE_LIMIT',
  ROUTING_FAILURE: 'ROUTING_FAILURE',
  LOADER_FAILURE: 'LOADER_FAILURE',
  UNHANDLED: 'UNHANDLED',
};
