---
title: Suspense Accounts
cta_title: Questions about reconciling payments?
cta_text: Ask Mewsie about suspense accounts, clearing accounts, or how specific payment types should be posted.
cta_button: Ask Mewsie about suspense accounts
cta_message: How do suspense accounts work in Omniboost for hotel payment reconciliation?
---

## What is a suspense account?

A suspense account is a general ledger account where amounts are temporarily parked. Think of it like an inbox: money arrives and sits there until it can be matched to something. In hotel accounting, suspense accounts are most commonly used for payment methods, especially credit cards, Stripe, and Adyen.

## How it works step by step

- A guest pays by credit card at your hotel. Mews records the payment.
- Omniboost reads that payment and posts it as a DEBIT to your credit card suspense account in your accounting system.
- A few days later, Stripe or Adyen actually transfers the money to your bank account.
- Your accountant then posts a CREDIT to the credit card suspense account (matching the bank statement entry).
- The suspense account now balances to zero. The payment is fully reconciled.

## Why use suspense accounts?

The payment recorded in Mews (when the guest pays) and the actual bank receipt (when Stripe or Adyen transfers the money) happen at different times. The suspense account bridges that gap. It also makes reconciliation easy: you can always see exactly which payments are still in transit by looking at the balance on the suspense account.

## Common suspense accounts in hotel setups

- Credit card suspense account: for Visa, Mastercard, Amex, etc.
- Gateway suspense account: for Stripe or Adyen payments specifically
- City ledger suspense account: for corporate invoices not yet paid
- Deposit ledger account: for advance payments received before the guest arrives
