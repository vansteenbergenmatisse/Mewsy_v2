# frontend/

The chat widget — what the user actually sees and interacts with in their browser. It's built with plain HTML, CSS, and JavaScript — no frameworks, no build step, no complexity. Just three files.

## Files

### index.html

The page structure. Contains the chat window, the message area, the input field, and the send button. The whole widget is a single HTML file.

### styles.css

All the visual styling — colors, fonts, spacing, animations, the typing indicator dots, the option buttons, the language picker. If something looks wrong, start here.

### script.js

All the behavior — everything that happens when the user interacts with the chat. This is the most complex file in the frontend.

**What it does:**

- **Language picker** — shows a dropdown with country flags at the start of every conversation. The selected language is stored in `sessionStorage` and sent with every message.
- **Sending messages** — reads the input field, blocks empty submissions, sends the message to `POST /webhook/chat`, shows a typing indicator while waiting.
- **Rendering responses** — converts the markdown text from Claude into proper HTML (bold, italic, numbered lists, bullet points, tables, code blocks).
- **Option buttons** — when Claude asks a clarifying question with a short list of choices, those choices appear as clickable buttons. Buttons only appear for genuine choices — never for step-by-step instructions. When clicked, the button sends the full question + the chosen option together so the AI has full context.
- **"Something else" button** — always added as the last option when buttons are shown, so the user can always type a free-form answer.
- **Placeholder change** — when buttons are shown, the input placeholder changes to "Or type your own answer..." to make it clear typing is always allowed.
- **Empty submission guard** — the send button is disabled when the input is empty. One visible character minimum before you can send.

## How the frontend talks to the backend

Every user message is sent as a POST request:

```
POST /webhook/chat
{ "sessionId": "abc123", "chatInput": "How do I set up my accounting flow?" }
```

The backend replies with:

```json
{ "output": "Great question! Here's how..." }
```

The `sessionId` is generated once per browser tab and stored in `sessionStorage`. It links all messages in the same conversation together.
