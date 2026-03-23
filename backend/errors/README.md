# backend/errors/

This folder handles everything that goes wrong. When something breaks in the pipeline — the AI is down, a file is missing, the API runs out of credits — this code catches it, logs it properly, and sends the user a clean friendly message instead of showing them a scary error.

## Files

### errorHandler.js

The single place where all pipeline errors land. When anything crashes, this function:

1. **Logs** the full error with context — session ID, the user's message, what went wrong, when it happened
2. **Alerts** the team — sends a message to Slack or email (when those credentials are set up)
3. **Returns** a clean message to the user: *"Something went wrong on my end — please try again in a moment."*

The user never sees a stack trace, raw error message, or anything technical.

**Error types it handles:**
- `TOKEN_LIMIT` — the AI response got cut off because it was too long
- `RATE_LIMIT` — too many requests sent to the AI at once
- `ROUTING_FAILURE` — the routing agent didn't respond or gave a bad answer
- `LOADER_FAILURE` — a knowledge file was missing or the manifest had an error
- `UNHANDLED` — anything else unexpected

### alerts.js

Stub functions for sending alerts when something breaks. Currently empty — connect them when the credentials are ready:
- `sendSlackAlert()` — posts to a Slack channel via `SLACK_WEBHOOK_URL` in `.env`
- `sendEmailAlert()` — sends an email to `ERROR_EMAIL` in `.env`

## Environment variables needed (for alerts)

| Variable | What it's for |
|---|---|
| `SLACK_WEBHOOK_URL` | Where to post error alerts in Slack |
| `ERROR_EMAIL` | Email address to send error notifications to |
