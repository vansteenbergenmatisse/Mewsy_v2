# backend/integrations/

This folder contains connections to external services — tools outside of Mewsie that Mewsie needs to talk to. Right now there's only one: Salesforce for creating support tickets.

## Folders

### salesforce/
When a user is frustrated and can't get their answer after several tries, Mewsie offers to create a support ticket on their behalf. That ticket gets sent to Salesforce — Omniboost's customer support system — where a real human can follow up.

This is currently a stub (the skeleton is there but the actual API connection isn't wired up yet). See `salesforce/README.md` for details on what needs to be implemented.

## How to add a new integration

1. Create a new folder with the service name (e.g. `backend/integrations/slack/`)
2. Add an `index.js` with the functions you need
3. Add a `README.md` explaining what it does and what credentials are required
4. Import and call it from `backend/pipeline/agent.js` where appropriate
