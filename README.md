# Mewsy v2

Mewsy is a support chatbot for OmniBoost — a company that connects hotel software systems like Mews (the hotel front desk system) with accounting tools like Xero or Exact Online. When hotel staff have questions about how to set up or use the integration, they talk to Mewsy.

## How it works in plain English

1. A user opens the chat widget in their browser and picks their language
2. They type a question — for example "How do I set up my accounting flow?"
3. The backend reads that question and asks a small, cheap AI model: "Which of our documents is most useful for this question?"
4. The backend loads just those documents (not all 200 — just the relevant ones)
5. A smarter, more capable AI model reads the question + the documents and writes a reply
6. The reply goes back to the browser and appears in the chat

No guessing. If the answer isn't in the documents, Mewsy says so and asks for more context.

## Folder overview

```
Mewsy_v2/
├── backend/        The server — handles all the logic
├── frontend/       The chat widget — what the user sees in their browser
├── knowledge/      All the documents Mewsy reads to answer questions
├── prompts/        The instructions given to the AI for how to behave
├── .env            Secret keys (API keys, passwords) — never share this file
└── package.json    List of software packages this project uses
```

## How to run it locally

```bash
# Install everything
npm install

# Start the server (auto-restarts when you edit files)
npm run dev

# Open your browser at:
http://localhost:3000
```

## How to add credits to the AI

Mewsy uses Anthropic's Claude. If responses stop working, top up credits at:
https://console.anthropic.com/settings/billing

## Environment variables (the .env file)

| Variable | What it's for |
|---|---|
| `ANTHROPIC_API_KEY` | The key to use Claude AI |
| `PORT` | Which port the server runs on (default: 3000) |
| `CONFLUENCE_EMAIL` | Email for logging into Confluence |
| `CONFLUENCE_TOKEN` | Password token for Confluence |
| `CONFLUENCE_BASE_URL` | The URL of the Confluence workspace |
| `FIRECRAWL_API_KEY` | Key for the web scraping service |
