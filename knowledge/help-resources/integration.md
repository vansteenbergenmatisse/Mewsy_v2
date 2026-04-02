---
title: How the Integration Works
cta_title: Want to understand your specific setup?
cta_text: Ask Mewsie about your accounting system, flow type, or mapping configuration.
cta_button: Ask Mewsie about the integration
cta_message: How does the Mews and Omniboost integration work?
---

## The simple picture

Your hotel data lives in Mews. Your accounting software needs that data. Omniboost is the bridge in the middle. Every day, Omniboost reads the previous day's data from Mews, transforms it into the right format for your accounting system, and sends it across automatically. You do not need to do anything once it is set up.

## Step by step: what happens every day

- At your configured end of day (default: midnight), Mews finalises the day's data in its Accounting Report.
- Omniboost fetches that data from Mews via the Mews API.
- Omniboost applies your mapping rules, matching each Mews category to the correct account code in your accounting system.
- Omniboost creates journal entries (or invoices, depending on your flow) and posts them to your accounting system.
- Everything appears in your accounting software the next morning, ready to review.

## Two types of integration

API integrations post data directly and automatically into your accounting software. Financial Export integrations produce a CSV or TXT file in the correct format for your accounting system that gets sent to a specified email or secure FTP location every day, ready for you to import. Most Mews integrations are API-based.

## What data gets transferred

- Revenues: broken down by service category (accommodation, F&B, spa, extras, etc.)
- Payments: by payment type (cash, card, city ledger, gateway, etc.)
- VAT / Tax: extracted from gross amounts and posted to the correct tax accounts
- Accounts Receivable: debtor invoices when using the Closed bills flow
- Statistics (Gold tier only): arrivals, departures, rooms out of order, number of guests, etc.

## Can I trigger it manually?

Yes. From the Omniboost portal you can manually trigger a push for any specific date or date range at any time. This is useful for testing, catching up after a gap, or re-sending a specific day if something went wrong.
