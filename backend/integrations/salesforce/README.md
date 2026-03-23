# backend/integrations/salesforce/

When a user has been going back and forth with Mewsy without getting their problem solved — or when they explicitly ask to speak to a human — Mewsy offers to create a support ticket. That ticket goes into Salesforce, where the OmniBoost support team picks it up and follows up with the user directly.

## Current status

**Stub only** — the function exists and has the right shape, but it doesn't actually connect to Salesforce yet. The `createTicket` function logs to the console and returns `{ success: false }`.

## Files

### index.js

Exports one function: `createTicket(sessionContext, issueDescription)`

- `sessionContext` — the user's conversation context (language, tools mentioned, setup type, etc.)
- `issueDescription` — a short summary of what the user is stuck on

When implemented, this will create a new case in Salesforce via the REST API using OAuth 2.0.

## How to implement it

1. Get your Salesforce credentials from the Salesforce admin
2. Add these to your `.env` file:
   ```
   SALESFORCE_INSTANCE_URL=https://yourorg.my.salesforce.com
   SALESFORCE_CLIENT_ID=your_client_id
   SALESFORCE_CLIENT_SECRET=your_client_secret
   ```
3. Implement the OAuth 2.0 token fetch and the case creation POST request in `index.js`
