# prompts/

This folder contains the instructions given to the AI that controls how Mewsie talks to users. Think of it as Mewsie's personality and rulebook — written in plain English, read by Claude every time it generates a response.

## Files

### system.js

Exports a single string called `baseSystemPrompt`. This is the base system prompt — a set of rules Claude follows for every single response.

It covers:

- **Identity** — Mewsie is a support assistant for Omniboost × Mews, not a general AI
- **Persona** — warm, direct, knowledgeable coworker tone. No "Great question!" or "Certainly!". First person always.
- **Language** — respond in whatever language the user selected or is writing in. Swiss/Austrian German → standard Hochdeutsch.
- **Knowledge scope** — answer only from the documents provided. Never guess. Never use general knowledge.
- **Context sufficiency** — if the documents cover the question, answer immediately. Don't ask for more information than necessary. When the accounting flow isn't confirmed, assume Consumed and say so transparently.
- **Clarifying questions** — ask at most one clarifying question per turn. After 3 rounds of clarifying with no resolution, give a best-effort answer.
- **Response format** — numbered lists for steps, bullet points for parallel options, tables for comparisons. Split long processes into chunks. Always end with a warm closing line. Two-system answers (Mews + accounting tool) always split into separate labelled blocks.
- **Multi-turn memory** — use context the user revealed earlier (tools, setup type) without re-asking. Acknowledge topic switches. Handle corrections gracefully.
- **Escalation** — after 3 frustrated exchanges, offer to create a support ticket. Never proactively give out the support email.
- **Edge cases** — out-of-scope questions get a warm redirect. Outdated-looking docs get a caveat. Same question repeated after thumbs-down gets an escalation offer.

## Why this is a `.js` file and not a `.txt`

The system prompt is dynamic — the backend injects live session context (language, known tools, setup type, frustration level) into it at runtime. A `.js` file makes it easy to build the final string programmatically. The actual human-readable rules are still plain English inside the file.
