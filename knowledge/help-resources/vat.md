---
title: VAT & Tax Codes
cta_title: VAT setup question?
cta_text: Ask Mewsie about VAT code mapping, rates, or how tax posting works for your accounting system.
cta_button: Ask Mewsie about VAT
cta_message: How does VAT and tax code mapping work in Omniboost?
---

## What is VAT mapping?

VAT mapping tells Omniboost which tax code in your accounting system corresponds to each tax rate in Mews. For example, Mews might have a 21% VAT category for accommodation. You need to map that to the correct 21% VAT account code in your accounting software so the tax gets posted to the right place.

## The most important rule: extract from GROSS

When you set up VAT codes in Omniboost, make absolutely sure they are configured to EXTRACT VAT from the gross amount, not ADD VAT to the net amount. These produce different results. If a guest pays 121 EUR for a room (100 EUR net plus 21 EUR VAT at 21%), the correct approach is to extract 21 EUR from the 121 EUR gross. If you accidentally configure it to ADD 21% to the net, you will calculate a different VAT figure and your tax reporting will be wrong.

## How to check your VAT code configuration

In your accounting system, check the settings for each VAT code you are using. It should say something like inclusive or extract from gross, not exclusive or add to net. If you are not sure, ask your accountant or the accounting software's support team. Once it is set correctly in your accounting system, just enter the code in Omniboost's mapping.

## Multiple VAT rates

Hotels typically have multiple VAT rates: accommodation may be at a reduced rate, food and beverage at a standard rate, and some items may be zero-rated. Each category in Mews needs its own VAT code mapped to the corresponding rate in your accounting system. Do not use one catch-all VAT code for everything.

## What happens if a VAT code is missing?

If a Mews category does not have a VAT code mapped in Omniboost, the tax for that category will not be posted correctly. Depending on your setup, it may land in a fallback account or cause a posting error. Always make sure every revenue category has both a revenue account AND a VAT code mapped.
