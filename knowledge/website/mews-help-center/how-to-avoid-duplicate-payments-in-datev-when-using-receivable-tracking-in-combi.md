# How to avoid duplicate payments in Datev when using receivable tracking in combination with the Omniboost Datev integration in Mews Operations

When you use the Receivable tracking setting (https://help.mews.com/s/article/Receivable-tracking-enabled-or-disabled?language=en_US#Enabling-receivable-tracking) in Mews Operations, you track invoice payments within the Mews system. If your property uses Datev as its accounting system, there is a risk of duplicate invoice payment entries. This is because Datev has its own built-in bank account integration. When you enable invoice tracking in Mews, payments can sync through both Mews and Datev's direct bank connection simultaneously. This results in duplicates in your accounting system. Omniboost can filter out these duplicate payments coming from Mews on your behalf.

In this article you can learn about the following steps to avoid duplicate payments when using receivable tracking with Omniboost integrations in Mews Operations:

## Prerequisites

1. Enable receivable tracking (https://help.mews.com/s/article/Receivable-tracking-enabled-or-disabled?language=en_US) in Mews Operations.
2. Create a separate accounting category (https://help.mews.com/s/article/create-an-accounting-category?language=en_US) for Wire Transfer Payments invoice payments in Mews Operations.
3. Contact [support@omniboost.io](mailto:support@omniboost.io) to request filtering and include the name of the new accounting category.

## Step 1: Allocate payments to invoices when entering in Mews Operations

To ensure the solution works, follow these steps:

1. In Mews Operations, go to the main menu [icon] > **Finance** > **Ledgers** > **City ledger**.
2. In the **Invoice** column, check the box next to the invoices you want to pay. **_Note_**: _You can select all invoices belonging to an owner by checking the box next to their name._
3. In the banner, click **Process Payment** to take a payment with Mews Payments or click > **Add external payment** to enter an external payment.
4. In the Process payment side-window, Mews automatically fills in the details below:
   - **Link payment to invoices:** Review the invoices you selected. **_Note_**: _To remove an invoice, click **x** next to the invoice number. To add an invoice, click on the **Link payment to invoice** field and search by invoice number or invoice owner._
   - **Select payment owner:** Review the payment owner. **_Note_**: _To modify the payment owner, click and click to select an owner._
5. Click **Next.**
6. In the Payment method side-window, confirm the following details:
   - **Select payment method:** Use a saved method or add a new payment method.
   - **Amount:** Enter payment amount. By default, this value is the sum of the selected invoices.
   - **Currency:** Click the field and select a currency from the dropdown menu.
   - **Notes:** Enter any important additional information for internal reference.
7. Click **Submit** to process payment for the selected invoices.

If you complete the related configuration in your Omniboost onboarding profile and you allocate payments to invoices when entering them into Mews, Omniboost excludes the payment from export to your accounting platform.

**_Note_**: _Omniboost may still duplicate the payment if,_

- _You enter the payment without allocating it to an invoice._
- _You allocate a payment to an invoice after entering the payment into Mews._