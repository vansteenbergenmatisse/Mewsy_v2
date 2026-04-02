---
title: Gateway Commission Costs
cta_title: Setting up gateway commission tracking?
cta_text: Ask Mewsie about gateway payments, commission cost accounts, or how to reconcile Stripe and Adyen.
cta_button: Ask Mewsie about gateway fees
cta_message: How does Omniboost handle gateway commission costs from Stripe or Adyen?
---

## What are gateway payments?

Gateway payments are card payments processed through a payment gateway, typically Stripe or Adyen. When a guest pays 100 EUR by card via one of these gateways, the gateway takes a commission (their fee for processing the payment, usually a small percentage) and transfers the remainder to your bank account. So instead of receiving 100 EUR, you might receive 97.50 EUR because Stripe kept 2.50 EUR as its commission.

## The problem this creates

In Mews, the full 100 EUR payment is recorded. In your bank account, only 97.50 EUR arrives. If you do not account for the 2.50 EUR commission somewhere, your bank statement will never reconcile with your accounting records. Someone would have to manually post the difference every day, which gets tedious fast.

## How Omniboost solves it

If you enable the gateway commission cost option in Omniboost, it will automatically split the gross gateway payment into two parts: the net amount (97.50 EUR) goes to your gateway suspense account, and the commission (2.50 EUR) goes to a separate commission cost ledger account. When the bank transfer arrives, it matches exactly and no manual adjustment is needed.

## What you need to set up

To use this feature, you need a ledger account code in your accounting system for gateway commission costs (an expense account). Provide this code to Omniboost during your mapping setup. The commission amount is calculated automatically based on the actual amounts.

## Only for gateway payments

This automatic splitting only applies to payments processed through a payment gateway such as Stripe or Adyen. It does not apply to cash payments, city ledger, or other non-gateway payment types.
