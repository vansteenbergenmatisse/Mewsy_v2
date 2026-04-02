---
title: Troubleshooting
cta_title: Issue not listed here?
cta_text: Ask Mewsie to describe your specific problem. It can help diagnose most common integration issues.
cta_button: Ask Mewsie for help
cta_message: I have an issue with my Omniboost integration. Can you help me troubleshoot it?
---

## Unmapped categories (fallback warnings)

If the Omniboost portal shows warnings about unmapped items, it means a revenue or payment category in Mews does not have a ledger account code assigned. Go to your mapping configuration in the Omniboost portal, find the flagged categories, and assign the correct account codes from your Chart of Accounts. Future pushes will then post correctly. Past entries that went to your fallback account will need a manual correction in your accounting system.

## Mews API token expired

If you see an authentication error from Mews, your Access Token has probably expired. Regenerate a new Access Token in Mews Commander (Mews Menu, then Settings, then Integrations, find your Omniboost connection, then regenerate token) and update it in the Omniboost portal under your property settings. The push will work again from the next run.

## Data mismatch: figures do not match Mews

If the numbers in your accounting system do not match your Mews Accounting Report, check: (1) the date range, make sure you are comparing the same dates and accounting flow type; (2) timezone settings, if your Mews end-of-day is not midnight, data may fall on different dates; (3) corrections and rebates, if any corrections were made in Mews after the initial push, they may need to be re-sent; (4) whether the Consumed or Closed flow matches how you are reading your Mews report.

## Duplicate invoices in accounting

If you are seeing duplicate invoices, the most likely cause is that Receivable Tracking was left ON in Mews when the integration was activated. Both Mews and Omniboost created invoices for the same transactions. Turn off Receivable Tracking in Mews (Menu, then Settings, then Property, then Finance, then Accounting Configuration) and contact Omniboost support to sort out the duplicates.

## NORMAL payments appearing (Lightspeed K-Series)

If you use Lightspeed K-Series and see payments labelled NORMAL in your accounting system, these come from receipts that were closed with a zero amount by a staff member removing all items instead of properly voiding the ticket. The fix is operational: train staff to always use the Cancel or Void function in Lightspeed instead of removing items from a receipt. This prevents the zero-amount entries from being created in the first place.

## Push not running automatically

If the daily automation has stopped running, check: (1) that automation is still enabled for your property in the Omniboost portal; (2) that your Omniboost subscription is active and not expired; (3) that your Mews token and accounting system credentials have not expired. If everything looks correct, contact Omniboost support.

## Locked accounting period

If your accounting system has a period locked (common after month-end closing), Omniboost will not be able to post to that period. Unlock the period in your accounting software, then manually re-trigger the push for the affected dates from the Omniboost portal.
