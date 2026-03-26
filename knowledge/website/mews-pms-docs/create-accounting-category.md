# How to create an accounting category in Mews Operations

You can classify and map your property's product inventory and revenue with accounting categories. Once set up, your accounting team can use these accounting categories to track and report your revenue. You need to create all your accounting categories before you connect to an accounting integration. You can create up to 300 accounting categories in Mews Operations.

**Note:**

- When creating and setting up accounting categories Mews recommends you consult with your accounting team, since these configurations are important to them. It may also not be necessary to complete all the available fields.
- If you are connecting to M3 accounting integration, note that this connection requires a different Mews configuration, click here (https://help.mews.com/s/article/How-to-add-the-accounting-integration-M3?language=en_US) for more details.

# Recommended accounting categories

The International Financial Reporting Standards (IFRS) recommends the following accounting categories for tourism, hospitality, and leisure revenue reporting.

## Accounting categories classification

| | |
|---|---|
| **Accommodation** | Room revenue<br>Cancellation revenue<br>Deposit<br>Discount<br>Late check-out |
| **Food and Beverage** | Breakfast<br>Bar<br>Minibar<br>Shop |
| **Payments** | Paid out<br>Cash<br>Visa<br>MasterCard<br>American Express<br>Other CC<br>Bank transfer |
| **Sundry income** | Laundry Parking<br>Service charge<br>Miscellaneous |
| **Taxes** | City tax |

# How to create an accounting category

## If you don't use an external accounting software

If you don't use an external accounting software, you don't need to set up any codes with your accounting category.

1. In Mews Operations, go to the main menu > **Settings** > **Property**.
2. Click on the **Finance** drop-down and then click **Accounting categories**.
3. Click **+**.
4. Enter the name of the accounting category.
5. Under **Code**, you can enter a code for internal tracking in Mews Operations.
6. Click **Create**.

**Note:**

- The **Classification** field displays recommended categories from the International Financial Reporting Standards. Use this field only if your accounting software requires this info.
- Use the **Export without tax** option only if you configure your accounting software to calculate taxes on its own.

## If you use an external accounting software

If you have external accounting software, you can set up the additional code fields. You need to assign all accounting categories a **Ledger Account Code**, without which Mews and the accounting integration cannot exchange information. Consult your accountant to fill this out correctly.

Mews recommends that you consult your accounting team before filling in the following fields:

- **External code**: The bookkeeping code for external use.
- **Cost center code**: You can use this code to differentiate departments. **For example**, if you need to book all bar revenue to the department/ cost center restaurant.
- **Ledger account code**: You can use this mapping code to connect Mews with your accounting software. **For example**, if "Accommodation" has a ledger code of 100 in Exact software, it must also be 100 in Mews.
- **Posting account code**: You can use this code to define which entity you want to book revenue. **For example**, if you have multiple hotels running through one system and want to see a split.

You can learn more about making sure your Mews environment is correctly setup and connecting to your accounting integration in detail here (https://mews.force.com/s/article/how-can-i-connect-my-accounting-integration?Language=en_US).