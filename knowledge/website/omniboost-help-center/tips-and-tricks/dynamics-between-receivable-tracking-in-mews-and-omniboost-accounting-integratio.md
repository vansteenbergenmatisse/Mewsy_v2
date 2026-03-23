# Dynamics between Receivable Tracking in MEWS and Omniboost Accounting Integrations

In MEWS is there is an option that is called: Receivable tracking. This option can be found in the accounting configuration as seen below.

## What does receivable tracking do?

This option allows a property to manage their accounts receivables (debtors) in MEWS. What happens is when an invoice is issued, that invoice is closed and a "receivable invoice payment" is created. That receivable invoice payment can be found in an accounts receivables overview in MEWS. This way properties can manage their AR in MEWS.

## Consequences for the accounting integration via Omniboost

Enabling the receivable tracking in MEWS has the following consequences for our integration:

- Imagine we post the debtors for you to the accounting platform. When that debtor makes a payment (usually via wire transfer) you reconcile the payment with the debtor/invoice in your administration. Everything is done now. But, when in MEWS the receivable tracking was enabled a receivable invoice payment is still open. Then the property adds that payment (wire transfer) to MEWS to reconcile the debtor in MEWS as well. The problem that occurs now is that another payment is registered in MEWS that we send to the accounting platform. That payment is now processed twice in the administration. That is not something you want.

- Another problem is that because of the receivable tracking, the property can create invoices that look like the screenshot below. As you can see an invoice is created where no revenue is charged. Only payments are added. Therefore this is not an invoice and we do not post these kind of documents to the accounting platform. This results in the fact that for closed integrations, the invoice numbers are not consecutive anymore.

- A third downside could be is that you now have to manage your debtors in 2 systems (accounting platform and MEWS). So the accounting team needs to provide information to the property when the debtors are paid so that they can add that payment in MEWS. When the property does not add the payments to MEWS a huge amount of open debtors will stay in MEWS and will blur some of the overviews in MEWS.

- Last but not least, activating the receivable tracking option will make it harder (and sometimes impossible) to match your guest ledger with reports in MEWS.

## Conclusion

We strongly advise to disable the option for receivable tracking when you have an accounting integration with us. That will save you a lot of problems later on.