# Accounting integration unable to post payment entry to Debtor ledger account

**Omniboost accounting integrations that run via an API-connection sometimes return an error message that concerns the inability to post a payment amount to a ledger account of the type Debtors / Accounts Receivable in your accounting platform. This article explains the cause of this issue and provides possible solutions.**

## Error Notification

The specific error message for this issue is different per accounting platform but generally takes the following forms:

```
Specify a relationship for ledger account X
```

(Where 'X' is the ledger account in your chart of accounts which is of the type 'Debtors' or 'Accounts Receivable').

Or:

```
When you use Accounts Receivable, you must choose a customer in the Name field.
```

## Explanation of the error message

The error notification means that the Omniboost accounting integration between your PMS system and accounting platform is unable to post a certain (payment) amount to the concerned ledger account.

More specifically, the error message pops up when the integration tries to post a journal entry in your accounting platform. The concerned ledger account has the type 'Debtor' or 'Accounts Receivable' in your accounting platform, meaning that your accounting platform **requires** Debtor information to be included when sending over a payment amount to that ledger account.

However, if there is **no** Debtor information included in the posting to the concerned ledger account, the accounting integration returns the error message.

## Example(s)

Please find below an example concerning an accounting integration with MEWS PMS to Exact Online accounting.

**Please note that the below example can be applied to every PMS to Accounting platform integration.**

- The ledger account code 1300 is mapped to an accounting categorie named 'Debiteuren' in MEWS.

Therefore, the Omniboost accounting integration will try to post any entries under the accounting categorie 'Debiteuren' to ledger account code 1300 in the accounting platform.

- Once the accounting integration tries to post an entry to ledger account 1300, the error message that the accounting platform returns is:

```
Specify a relationship for ledger account 1300
```

This error lets us know that ledger account 1300 has the type 'Debtor' or 'Accounts Receivable' in the accounting platform.

Therefore, the accounting platform requires Debtor information to be included for entries being posted to ledger account 1300.

- We lookup the entries under accounting categorie 'Debiteuren' in the PMS system to see whether there is Debtor information included in these entries.

- Any entries under to the accounting category 'Debiteuren' that do not contain debtor information, will cause the error.

The external invoice payment of EUR 5,50 is not considered as an actual invoice in MEWS. **This is because there is no open balance (as shown by the EUR 0,00 amount) and therefore this entry does not contain any debtor information either.** In other words, the customer 'Paymaster GBS' is not considered a debtor.

Thus, the accounting integration tries to post any entries under the accounting category 'Debiteuren' to ledger account 1300. However, we receive an error message that the accounting integration is unable to post the entry, because the entry does not contain debtor information (whereas it should).

## Solutions

There are several solutions available to the above issue.

### Solution 1: Modify the payment mapping/configuration in your PMS system

The first solution would be to map the concerning payment entries, which do not contain debtor information (in other words the payment entries which cause the issue) to a different accounting category in your PMS. This can usually be done under the accounting configuration section in your PMS. The concerning payments can be mapped to either an existing accounting integration, or a newly created accounting integration.

The ledger account code which is mapped to the new accounting categorie should be different from the ledger account code corresponding to the issue.

Applied to the practical example in this article, this would mean that the 'External invoice payments' (which caused the issue because there is no debtor information attached to this payment entry) should be mapped to a different accounting category. The different accounting category should then be mapped to another ledger account code than 1300. This other ledger account code should of course not be of the type 'Debtor' or 'Accounts Receivable' in your chart of accounts, otherwise we will run into the exact same issue.

### Solution 2: Modify just the ledger account code in your PMS

Another solution would be to simply map a different ledger account code in your PMS system to the concerned accounting category.

Applied to the above practical example, this would mean that the accounting category 'Debiteuren' gets a ledger account code different from 1300 mapped to it in MEWS. This other ledger account code should of course not be of the type 'Debtor' or 'Accounts Receivable' in your chart of accounts, otherwise we would run into the exact same issue.