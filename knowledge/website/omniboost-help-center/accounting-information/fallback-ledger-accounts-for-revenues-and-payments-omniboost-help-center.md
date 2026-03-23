# Fallback ledger accounts for Revenues and Payments

This article describes the requirement of using fallback ledger accounts for revenues and payments in accounting integrations with MEWS PMS

**In our accounting integrations that connect MEWS PMS with accounting platforms, we always ask our clients to provide fallback ledger account codes for revenues and payments. This article explains the necessity of working of fallback ledger accounts.**

## Fallback ledger account for revenues

It can occur that not all revenues are correctly mapped to an accounting category in MEWS. Such revenues can be recognized by 'None' under the Revenue section in the Accounting report. Please find an example below.

In order to post all revenues from the Accounting report to their corresponding ledger account codes, Omniboost integrations lookup the mapping of ledger account codes to accounting categories in the MEWS setup. However, the 'None' revenues above show us that these revenues are not being assigned to an accounting category. Therefore, technically the accounting integration would not be able to post these revenues to a specific ledger account code. The fallback ledger account for revenues makes sure that this will still happen. **We therefore request you to create (in case a fallback ledger account for revenues did not exist in your chart of accounts yet) and provide us the fallback ledger account code.**

For example, if the fallback ledger account code for revenues is 1234, then the above (net) revenue amount of 9668.37 CHF would be posted to ledger account code 1234 in your accounting platform.

## Fallback ledger account for payments

It can occur that not all payments are correctly mapped to an accounting category in MEWS. Such payments can be recognized by 'None' under the Payments section in the Accounting report. Please find an example below.

In order to post all payments from the Accounting report to their corresponding ledger account codes, Omniboost integrations lookup the mapping of ledger account codes to accounting categories in the MEWS setup. However, the 'None' payments above show us that these payments are not being assigned to an accounting category. Therefore, technically the accounting integration would not be able to post these payments to a specific ledger account code. The fallback ledger account for payments makes sure that this will still happen. **We therefore request you to create (in case a fallback ledger account for payments did not exist in your chart of accounts yet) and provide us the fallback ledger account code.**

For example, if the fallback ledger account code for payments is 5678, then the above payment amount of 164.80 EUR would be posted to ledger account code 5678 in your accounting platform.

## To summarize

Fallback ledger accounts basically serve as safety nets because they make sure that revenues and payments can be sent over to your accounting platform even though they are not fully mapped in MEWS PMS. In order words, these ledger accounts ensure a complete data transfer. The fallback ledger accounts (one ledger account for revenues, and one ledger account for payments) should be part of the chart of accounts in your accounting platform. Therefore, it is not necessary to create these ledger accounts in MEWS.

We would advise you to complete the revenue and/or payment mapping in your MEWS environment in case you see revenue and/or payment amounts being posted to the fallback ledger accounts in your accounting platform.