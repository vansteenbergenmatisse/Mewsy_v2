# backend/

This is the brain of Mewsy. It's a Node.js server that receives messages from the chat widget, figures out which documents to read, asks Claude for an answer, and sends it back.

## Files in this folder

**`server.js`** — The front door. Starts the web server, serves the chat widget to the browser, and listens for messages. Two routes:
- `POST /webhook/chat` — receives a question, runs the pipeline, returns an answer
- `GET /health` — quick check to confirm the server is alive

**`config.js`** — Reads the `.env` file and shares the secrets with the rest of the backend. Only exports `ANTHROPIC_API_KEY` and `PORT`.

## Folders inside here

```
backend/
├── config/         One file with all the tunable settings (doc limits, thresholds, etc.)
├── errors/         Catches anything that breaks and handles it without crashing or exposing errors to users
├── fetch/          Validates the knowledge manifest when the server starts up
├── integrations/   Connections to external services (Salesforce for support tickets — stub for now)
├── pipeline/       The main logic — routing questions, loading documents, generating answers, session memory
└── scraper/        Separate system that automatically fetches and updates knowledge documents on a schedule
```

## How a message flows through the backend

```
Browser sends message
    ↓
server.js receives it at POST /webhook/chat
    ↓
pipeline/agent.js coordinates everything
    ↓
pipeline/claude.js asks Claude Haiku: "which documents are relevant?"
    ↓
agent.js loads just those documents from knowledge/
    ↓
pipeline/claude.js asks Claude Sonnet to write the answer
    ↓
server.js sends the answer back to the browser
```
