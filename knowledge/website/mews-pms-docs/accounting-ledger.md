# The Accounting ledger

**_Note:_** _This article relates to a prior ledger solution in Mews Operations. If your property is using the new Ledgers feature,_

- _use the new Ledger activity report (https://help.mews.com/s/article/The-Ledger-activity-report-in-Mews-Operations). The new report is specifically designed for accountants and provides a more complete view of ledger balances and transactions. Learn more in our help article Ledgers in Mews Operations FAQs (https://help.mews.com/s/article/Ledgers-in-Mews-Operations-FAQs)._

The Accounting ledger in Mews Operations is an overview of all guest profiles with unpaid/ unsettled balances on their accounts. Property owners, managers, accountants, Front Desk, and Reservation agents can use the ledger to help track and manage revenue and expenses and ensure accurate financial reporting. You can use the Accounting ledger at any stage of your day-to-day financial operations to record and track income and expenses, reconcile guest payments, and review property financial records for accuracy and compliance.

At the top of the report, highlighted in orange by the **To be resolved** tag, are the profiles that need immediate action as the guests have checked out. The Accounting ledger displays amounts in the following two ways:

- Positive amounts owed to the property by the customer.
- Negative amounts owed to the customer by the property.

You can view the details of these transactions by selecting the **Detailed Mode** filter of the report.

To view the Accounting ledger in Mews Operations,

- on the Dashboard, in the **Finance** section, click on the Accounting ledger icon, or
- go to the main menu > **Finance** > **Accounting ledger**.

## Setting the filters in the report

You can refine data in the Accounting ledger with the following filters:

- **Mode**
  - **Detailed:** To view an itemized list, including each item on customer accounts.
  - **Grouped:** To view only customer totals.
- **Type**
  - **General:** All guest accounts with open balances, including receivable payments, i.e., invoices.
  - **Guest ledger:** All guest accounts with open balances.
  - **Receivables:** All accounts with open or overdue invoice payments.
- **Date:** Select a specific date and time for which you want to view the report.
- **Group by:** Indicate in which order you'd like the report variables to appear.
  - **Accounting category:** View in order of accounting categories used at your property.
  - **Bill owner:** View all owners with open balances, appearing alphabetically by last name.
  - **Consumption date:** View in chronological order, starting with the oldest charge until the most recent charge.
  - **Service:** View report grouped by services ordered.
- **Profile**: View items from a specific customer or company profile. _**Note**: To search for a profile, type any part of the profile name. Then, click the desired profile to fill in the field automatically._
- **Profile type:** View items assigned to **Company** or **Customer**.
  - **Company:** View items assigned to companies.
  - **Customer:** View items assigned to customers.
- **Tax:**
  - **Included:** To include tax in the report.
  - **Excluded:** To view only revenue without tax.

_**Note:** By default, the Accounting ledger report displays totals with tax included. The Accounting ledger exported report includes a column for tax rate._

- **Options:**
  - **Highlight open payments:** This filter highlights any accounts where Mews posts an open/ unsettled payment. This option applies in countries where properties pay VAT when settling the bill, such as the Czech Republic, Germany, and Denmark. You should always close open bills with full payments, including deposits.

**_Note_**_:_

- _For properties paying VAT when settling a bill, Mews selects this option by default._
- _For properties in countries **not** paying VAT when settling a bill, this option is available but not selected by default._

## Understanding the fields in the report

- The first column depends on your selection for the **Group by** filter. In **Detailed** mode, the report groups the accounting items by one of the following options, and you can click the `+` button to expand a group and view more details about individual items.
  - **Accounting category**
  - **Consumption date**
  - **Owner**
  - **Service**
- **Profile type**: The item owner's profile type, **Company**, or **Customer**.
- **Consumed:** Date item consumption or posting on the customer bill. _**Note:** The report displays information in this column only when you run the report in **Detailed** mode._
- **Closed:** Date of payment and closing for that item. This column usually appears blank. _**Note:** The report displays information in this column only when you run the report in **Detailed** mode._
- **Open past revenue:** Items consumed but still on an open bill, **for example,** minibar items charged to guest accounts after their reservation ends.
- **Unpaid invoices:** Issued invoices but still unsettled.
- **Open prepayments:** Prepayments posted to bills that are not yet closed.
- **Closed future revenue:** Items not yet consumed but already paid for and closed on the bill prior to arrival, i.e., a non-refundable accommodation payment for a guest staying in the future. Mews recommends against closing bills prior to departure date, as you are not able to change details of the booking once a bill is closed.
- **Deposit ledger:** An overview of all prepayments, i.e., deposits, with no consumed revenue posted against them yet.
- **Guest ledger:** An overview of all consumed revenue that is not paid for or is on a bill that still needs to be closed.
- **General ledger:** A total sum of the **Deposit ledger** and the **Guest ledger**. Positive values represent the total amount of revenue due to the property. Negative values represent any amount due to the customer.

## Status labels

Mews flags items with status labels so you can take the necessary actions.

The status labels are:

- **To be resolved**: Items the guest has yet to consume that do not have payments to balance them. **_Note_**_: When you check in a reservation with a booker, Mews labels the item **To be resolved** and not **In-house** for the following reasons:_
  - _The guest is the reservation owner and not the booker._
  - _In scenarios involving deposits, Mews closes the positive deposit against the payment, and the negative deposit stays open with the items the guest has yet to consume. The booker remains on the **Accounting ledger** with a sum owed to the property until you finalize the bill at the end of the reservation. Once you close the bill, Mews removes the label and requires no action._

You can learn about how to track your unpaid/ unsettled balances with the Accounting ledger report export here (https://help.mews.com/s/article/Track-your-unpaid-unsettled-balances-with-the-Accounting-ledger-report-export).