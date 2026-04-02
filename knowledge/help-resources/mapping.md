---
title: GL Mapping & Ledger Codes
cta_title: Need help with your mapping setup?
cta_text: Ask Mewsie about specific mapping configurations, account codes, or unmapped categories.
cta_button: Ask Mewsie about mapping
cta_message: How does GL mapping and ledger account codes work in Omniboost?
---

## What is mapping?

Mapping is a dictionary. On one side you have Mews, which has categories like Accommodation, Breakfast, Minibar, Visa card payment, etc. On the other side you have your accounting software, which has account codes like 4000, 4100, 5500, etc. Mapping tells Omniboost: when you see Accommodation in Mews, put it in account 4000 in accounting. When you see Visa card payment, put it in account 5500. Without mapping, Omniboost does not know where anything should go.

## Where mapping happens in Mews

Every Accounting Category in Mews must have a Ledger Account Code assigned to it. This code must exactly match an account code that exists in your accounting software's Chart of Accounts. If a code is missing or wrong, the sync will fail for that category. The columns Code, External Code, and Posting Account Code in Mews are generally not used by Omniboost and can be left empty.

## Revenue mapping

Each revenue service in Mews (accommodation, food & beverage, spa, extras, etc.) must be mapped to a revenue account in your accounting system. Unmapped revenue items will either land in your Fallback Revenue account or cause warnings in the Omniboost portal.

## Payment mapping

Each payment type in Mews (cash, card, city ledger, Stripe, Adyen, bank transfer, etc.) must be mapped to the correct clearing or suspense account in your accounting system. This is how Omniboost knows whether a card payment should go to a Stripe suspense account, a cash payment to a cash account, and so on.

## VAT / Tax mapping

Tax codes from Mews must be matched to the correct VAT or tax rates in your accounting system. Make sure the VAT codes you enter are configured to extract VAT from the GROSS amount, not add VAT to the net amount. Getting this backwards will produce incorrect tax calculations.

## Cost centres (optional)

If your accounting system uses cost centres or profit centres, you can optionally add cost centre codes to your mapping. Omniboost will then attach the correct cost centre to each journal line, giving you department-level reporting in your accounting software.

## Omniboost auto-detects changes

If you add new accounting categories or change ledger codes in Mews, you do not need to notify Omniboost. Omniboost auto-detects changes to accounting categories and ledger codes. However, you should make sure the new codes exist in your accounting system's Chart of Accounts before they start being used, otherwise the sync will fail for those items.
