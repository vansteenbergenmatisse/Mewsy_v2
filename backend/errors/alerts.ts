// Stub alert functions — implement when credentials are available.

// Shape of the log entry passed from errorHandler.ts
interface LogEntry {
  timestamp: string;
  errorType: string;
  sessionId: string;
  userMessage: string;
  error: string;
  stack: string | null;
}

export async function sendSlackAlert(_logEntry: LogEntry): Promise<void> {
  // TODO: POST to process.env.SLACK_WEBHOOK_URL
  // Payload: { text: JSON.stringify(logEntry) }
}

export async function sendEmailAlert(_logEntry: LogEntry): Promise<void> {
  // TODO: send email to process.env.ERROR_EMAIL
}
