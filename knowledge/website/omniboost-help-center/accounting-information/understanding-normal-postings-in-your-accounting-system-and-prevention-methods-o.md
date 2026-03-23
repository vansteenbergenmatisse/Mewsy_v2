# Understanding 'NORMAL' Postings in Your Accounting System and Prevention Methods

This article explains why some payments in your accounting system are labeled 'NORMAL,' how these postings occur, and how to prevent them.

---

If you're using our Lightspeed K-Series → Accounting integrations, you may have noticed 'NORMAL' payments in your accounting system and wonder what they are and why they appear. Payment methods typically have clear names, such as Lightspeed Payments, Visa, Invoice, and others.

Each payment method has an attached 'Code', which you can view in the Lightspeed Backoffice by navigating to **Configuration** → **Settings** → **Payment Methods**.

Above is an example of how the payment methods are presented. Each payment method includes a Name, Code, and Type. Typically, during integration, we map based on the names, also referred to as descriptions. However, it can be confusing to receive payments with the code 'NORMAL' without any accompanying description or additional information.

This situation arises from incorrectly handled receipts at the POS. Specifically, it occurs when a server opens a receipt but opts to close the ticket without voiding it. Instead of voiding, they remove the items from the receipt and use the payment button to finalize a €/$0 receipt. Since no actual payment has been made, there is no code, description, or receipt ID associated with this transaction.

The correct procedure is to utilize the cancel or void function within Lightspeed to manage these tickets appropriately. By following this process, such postings will not be created and sent to your accounting system.

It is crucial for the integration to ensure that the POS is used correctly to prevent these issues from occurring.

**We hope this answers your question. If you have any further inquiries or feedback, please contact [support@omniboost.io](mailto:support@omniboost.io) or your designated Omniboost agent.**