// Stub alert functions — implement when credentials are available.

export async function sendSlackAlert(logEntry) {
  // TODO: POST to process.env.SLACK_WEBHOOK_URL
  // Payload: { text: JSON.stringify(logEntry) }
}

export async function sendEmailAlert(logEntry) {
  // TODO: send email to process.env.ERROR_EMAIL
}
