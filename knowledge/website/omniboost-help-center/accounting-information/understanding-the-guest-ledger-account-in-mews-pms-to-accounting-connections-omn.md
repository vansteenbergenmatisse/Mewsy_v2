# Understanding the Guest Ledger account in MEWS PMS to Accounting connections

Understand the Guest Ledger account in your MEWS PMS to Accounting platform connection.

# P1: Understanding the Guest Ledger Account

In the case of Omniboost accounting connections which run on a Consumed Accounting Flow (and sometimes on a Closed Accounting flow), you will notice a Guest Ledger account posting within the Journal entry that is posted in your accounting platform.

This Guest Ledger account posting is part of the Journal entry along with the other revenue, VAT, payment, and deposit entries of that day.

Please find a simplified example of a Journal entry - including a Guest Ledger account posting - below.

**Journal entry - Simplified Example**

| Line | Date | Ledger Account | Description | Debit (D) | Credit (C) |
|------|------|----------------|-------------|-----------|------------|
| 1 | 15-04-2024 | 840320 | Accommodation | | 4000 |
| 2 | 15-04-2024 | 830210 | Breakfast | | 750 |
| 3 | 15-04-2024 | 810010 | Cleaning Fee | | 125 |
| 4 | 15-04-2024 | 136001 | VISA Payments | 1500 | |
| 5 | 15-04-2024 | 136002 | Mastercard Payments | 3500 | |
| 6 | 15-04-2024 | 137000 | Cash Payments | 350 | |
| 7 | 15-04-2024 | 1000 | **Guest Ledger** | | 475 |

The Guest Ledger account serves as a balance account.

In the above example, we can see that:

- Total Credit: 4000 + 750 + 125 = 4875 (including VAT / Tax)
- Total Debit: 1500 + 3500 + 350 = 5350

The Debit side entries exceed the Credit side entries with (5350 - 4875) = 475.

In order to balance Journal entry's Debit and Credit sides, the Omniboost accounting connections posts a Guest Ledger account entry of 475 on the Journal entry's Credit side.

In other words, the Guest Ledger account posting can be either be a Debit or a Credit entry. Whether the Guest Ledger amount is posted on the Debit or Credit side of the Journal entry, depends on whether Revenues entries (including VAT or including Taxes) exceed Payment entries or vice versa.

### What are the components of the Guest Ledger account?

The Guest Ledger account (can) consist of the following components:

- **(1) In-House Guest entries**
  - This is the difference between consumed revenues and payments of in-house guests
  - Please note that an in-house guest balance is usually because often, in-house guests first consume revenues (accommodation, breakfast, etc.) and only pay for their stay upon check-out of the hotel.

- **(2) Deposits**
  - Referring here to deposits made by guests upfront of the actual guest arrival date.

- **(3) Accounts Receivable (A/R) entries**
  - These are revenues consumed by already checked-out guests who have not yet paid for their open bill (invoice).
  - In other words, A/R entries refer to open guest invoices.

## How to calculate the Guest Ledger account posting?

The MEWS Accounting Report is the main source of information for the majority of Omniboost accounting integrations. In the Accounting Report, you have a clear overview of the total Revenue, Payment, and Deposit amounts for a certain day. Of course, in case no Deposits are registered in the PMS for a certain day, then the Accounting Report will not show Deposit entries for that day either.

Via the MEWS Accounting Report, you can easily determine the Guest Ledger account posting for a certain day. You can do this check by applying the logic below:

- **Journal Entry Credit side:** Revenues + VAT / Tax + Positive Deposits
- **Journal Entry Debit side:** Payments + Negative Deposits

We can visualize the above as follows:

| Debit | Credit |
|-------|--------|
| Payments | Revenues |
| Negative Deposits | VAT / Tax |
| | Positive Deposits |

Let us say that (Payments + Negative Deposits) exceed (Revenues + VAT / Tax + Positive Deposits) on a certain day. This means that the Debit side exceeds the Credit side of the Journal Entry:

**Debit > Credit**

In order to balance this Journal Entry, a Guest Ledger account amount will be posted on the Credit side of the journal entry.

Vice versa, in case (Revenues + VAT / Tax + Positive Deposits) exceed (Payments + Negative Deposits) on a certain day, the Credit side exceeds the Debit side of the Journal Entry.

**Debit < Credit**

In order to balance this Journal Entry, a Guest Ledger account amount will be posted on the Debit side of the journal entry.

## Some details on Deposits

As you have noticed above, Deposits can be distinguished between Positive Deposits and Negative Deposits. Whether Deposits are distinguished between Positive and Negative Deposits in the MEWS Accounting Report, depends on the Deposit functionality settings in the PMS.

The following logic applies:

- Positive Deposits are posted on the Credit side of the Journal Entry.
- Negative Deposits are posted on the Debit side of the Journal Entry.

## Practical Examples

Please find some practical examples of Guest Ledger account calculations below.

**Example 1: Credit > Debit**

The Accounting Report screen image below shows the following amounts:

- Revenues without Tax: 3567.94 USD
- Tax: 516.80 USD
- Payments: 3280.32 USD

The Guest Ledger amount as calculated by the Omniboost accounting integration will be:

(3567.94 + 516.80) - (3280.32) = 804.42 USD

A simplified visualization of the Journal Entry would look like follows:

| Debit | Credit |
|-------|--------|
| 3280.32 | 3567.94 |
| 804.42 | 516.80 |
| Total: 4084.74 | Total: 4084.74 |

**Example 2: Debit > Credit**

The Accounting Report screen image below shows the following amounts:

- Revenues without Tax: 4847.70 USD
- Tax: 559.33 USD
- Payments: 13068.25 USD

The Guest Ledger amount as calculated by the Omniboost accounting integration will be:

(4847.70 + 559.33) - (13068.25) = -7661.22 USD

A simplified visualization of the Journal Entry would look like follows:

| Debit | Credit |
|-------|--------|
| 13068.25 | 4847.70 |
| | 559.33 |
| | 7661.22 |
| Total: 13068.25 | Total: 13068.25 |

## Conclusion

The Guest Ledger account entry in the Journal Entry accounts for the difference between Debit and Credit postings. Therefore, the Guest Ledger account balance in your accounting platform will fluctuate on a daily basis.

# P2: Understanding the Dynamics between the MEWS Accounting Report and MEWS Accounting Ledger Report

Many hotels find the Guest Ledger amount posted in Journal Entires to suffice for reconciliation purposes. Sometimes hotels prefer additional details in the sense that they require an overview showing the individual guests / items of which the Guest Ledger balance in their accounting platform consists.

From an accounting perspective, this is understandable. As we have seen in the first part of this document, the Guest Ledger balance can consist of several components, which are:

- (1) In-House Guest entries
- (2) Deposits
- (3) Accounts Receivable (A/R) entries

In order to get a more detailed insight into the above components of which the Guest Ledger account consists, a separate Deposit Ledger account in the accounting environment could be setup. When this Deposit Ledger account is mapped to the MEWS accounting category to which Deposit amounts are posted, the hotel will be able to have a more detailed overview of the Deposit balance in its accounting platform.

Additional details to break down the Guest Ledger account can also be found in the Accounting Ledger Report in MEWS. This is where the dynamics between the MEWS Accounting Report and Accounting Ledger Report become important.

## Practical Example(s)

Let us look again at the above screen image from the MEWS Accounting Report. In the first part of this help article, we have seen that the Guest Ledger posting for this day would be 804.42 on the Debit side of the Journal Entry.

We are also able to find the amount of 804.42 in the MEWS Accounting Ledger Report. Note that the above MEWS Accounting Report is ran for April 14. In order to find the Guest Ledger amount in the Accounting Ledger Report, we have to run the Accounting Ledger Report for April 14 and April 15.

**In case of reconciling the Guest Ledger account in the MEWS Accounting Report with the MEWS Accounting Ledger Report for a certain day X, we have to run the Accounting Ledger Report for that day X and the following day Y.**

Before running the Accounting Ledger Report, it is important to set the Report's parameters correctly:

| Parameter | Set to | Additional Comment |
|-----------|--------|--------------------|
| **Mode** | Detailed | |
| **Type** | General | |
| **Time** | 12:00AM | Please note that in case your integration runs at a different time than 12:00AM < > 12:00AM, the Accounting Ledger Report should also be ran according to this different time. |
| **Group by** | Bill Owners | |
| **Tax** | Included | Tax included because we also include VAT / Tax amounts in our Guest Ledger calculation. |

The column in the Accounting Ledger Report that we should look at in order to find the amount similar to the Guest Ledger amount from the Accounting Report, is the 'General ledger' column. We then look at the Total amount of this column.

- Accounting Ledger Report April 14
- General ledger column amount: 15287.84

- Accounting Ledger Report April 15
- General ledger column amount: 16092.26

We find the Guest Ledger amount from the MEWS Accounting Report when we subtract the General ledger column's total amount on April 15 from the General ledger column total amount on April 14:

= (16092.26 – 15287.84) = 804.42 USD.

## Some additional details on the Accounting Ledger Report

Above, the following was stated:

*''The column in the Accounting Ledger Report that we should look at in order to find the amount similar to the Guest Ledger amount from the Accounting Report, is the 'General ledger' column.''*

The above statement might be somewhat confusing because one might ask the following: Why not look at the 'Guest ledger column' in the Accounting Ledger Report rather than the 'General ledger column' when reconciling the Guest Ledger amount as posted in the Journal Entry?

The can be explained as follows. The Guest Ledger amount as posted in the Journal Entry in your accounting platform, which is based on a calculation from the Accounting Report in MEWS, takes into account all items from the Accounting Report. This includes both Revenues and Payments of in-house guests, as well as Deposits.

Therefore, in order to reconcile the Guest Ledger amount from the Accounting Report with the Guest Ledger amount from the Accounting Ledger Report in MEWS, we need to look at the combined value of the Deposit- and Guest ledger columns in the Accounting Ledger Report, which equals the total of the General ledger column.

General ledger column = (Deposit ledger column + Guest ledger column)

There are exceptions to this rule. In the case of some integrations, we should look specifically at the Deposit- and Guest ledger columns in the Accounting Ledger Report. Examples are the Sage Intacct and M3 accounting integrations. The reason why we should look at the Deposit- and Guest ledger columns specifically in the Accounting Ledger Report and not at the General ledger column, is simply because we have decided to send over these items separately in the Journal Entry instead of sending over a combined Guest Ledger amount (with combined we mean that deposits are included in this amount instead of distinguished).

In case you have difficulties with determining the reconciliation process for your accounting integration, please reach out to support@omniboost.io.