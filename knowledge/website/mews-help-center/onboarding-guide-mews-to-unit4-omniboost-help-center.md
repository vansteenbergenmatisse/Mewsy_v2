# Onboarding Guide | MEWS to Unit4

This article provides details on the MEWS PMS to Unit4 accounting integration. The accounting integration transfers data from MEWS to Unit4 via an API-connection.

**PART 1**: General setup process of the integration

**PART 2**: Determining the preferred accounting flow: Closed flow or Consumed flow

**PART 3**: Finish your MEWS (accounting) setup

**PART 4**: (Accounting) information necessary to build the MEWS to Unit4 integration

**PART 5**: Reconciliation of accounting data sent to Unit4

**PART 6**: Other features and configurable items

# PART 1: General setup process of the integration

The start-to-end process of the MEWS to Unit4 accounting integration goes as follows:

**1.1 Request the Unit4 integration from the MEWS Marketplace**

Omniboost will automatically receive the integration request and consequently reach out to you.

**1.2 Share your preferred accounting flow with Omniboost**

Please see PART 2 of this article.

**1.3 Finish your MEWS (accounting) setup**

Please see PART 3 of this article.

**1.4 Provide the necessary (accounting) information with Omniboost**

Please see PART 4 of this article.

**1.5 Omniboost to build the accounting integration**

Once the preferred accounting flow and required accounting information are available, the accounting integration can be setup by your Omniboost contact person within several business days.

**1.6 Omniboost to send test entries to your Unit4 environment and verification of test entries by your accounting department**

Once there is accounting data available in the MEWS Accounting report, the integration is able to send over test accounting entries to your Unit4 environment.

These test entries usually consist of some journal entries (and Sales entries along with the corresponding debtor information in case you would like to transfer Accounts Receivable information) and can be verified by your accounting department.

**1.7 Integration to be activated by Omniboost**

Once your accounting department has verified the test entries and these are correct, your Omniboost contact person can activate the accounting integration. This means that the integration will fully automatically send over the accounting data to your Unit4 environment on a daily basis.

Please note that the time of sending over this accounting data (on a daily basis) is usually early in the morning in your local timezone. In case you prefer a specific time, please reach out to your Omniboost contact person.

The days-delay with which the accounting integration will send over data from MEWS to your Unit4 environment, will depend on the Accounting Editable History Window settings in MEWS.

# PART 2: Determining the preferred accounting flow: Closed flow or Consumed flow

Before Omniboost can build the MEWS to Unit4 accounting integration, you need to specify your preferred accounting flow. Please see PART 2 of the article named 'Supported Accounting Flows' and let us know which accounting flow you prefer.

# PART 3: Finish your MEWS (accounting) setup

Before Omniboost can test the MEWS to Unit4 accounting integration, you need to specify finish your MEWS (accounting) setup. Please see PART 1 of the article named 'MEWS Accounting setup'.

# PART 4: Necessary (Accounting) information

In order to correctly transfer the accounting data from MEWS to Unit4, several pieces of accounting information are required. Please find those items below and provide them to your Omniboost contact person.

**4.1 Do you prefer a Closed or Consumed accounting flow?**

Please see PART 2 of this article.

**4.2 Please provide us a Guest Ledger account code.**

Please note that the Guest ledger account should **not** be created in MEWS. Instead, please provide us the guest ledger account code so that we can enter it into the accounting integration.

It is not always necessary to provide us with a Guest ledger account code. In the case of Closed accounting flows for example, it is generally not necessary to use a Guest Ledger account code. Your Omniboost contact person will be able to determine whether a Guest ledger account needs to be used or not.

**4.3 Please let us know whether the integration should include Accounts Receivable (A/R) information.**

Accounts Receivable information consists of sales invoices and the information of the corresponding debtor accounts. The integration is able to send over invoices\* to Unit4 via two ways:

- As sales entries (including debtor information)
- As part of general journal entries

**\*By default, invoices are sent over to Unit4 as Sales entries.** The reason for this is that VAT amounts are part of the journal entries that are sent over to Unit4. If the connection would send over actual invoices with VAT on the invoice lines to Unit4, VAT would be accounted for twice in the accounting platform. In order to prevent this from happening, the connection sends over a Sales entry rather than an actual Invoice.

In case you prefer invoice amounts to be sent over as part of the general journal entries, please reach out to your Omniboost contact person.

**4.4 Please activate the Unit4 Oauth-link as provided by your Omniboost Contact person.**

The MEWS PMS to Unit4 accounting integration is based on an API-connection which means that accounting data can be automatically pushed into your Unit4 environment. **Please note that** all entries which are pushed into your Unit4 environment, are **draft** entries. This means that you are always able to modify or remove these entries in case this is necessary.

In order to establish this API-connection, your Omniboost contact person will reach out to you with the request to activate a Unit4 Oauth-link. **Please note that activation of this link** only enables the Omniboost accounting integration to push data into your Unit4 environment. It does **not** give anyone from Omniboost access to the environment itself.

**4.5 Please provide us VAT codes for every VAT percentage**

We have built a VAT mapping in our accounting integrations to ensure a correct transfer of VAT amounts. Please provide your Omniboost contact person with a VAT code for every VAT percentage. These VAT codes are sent over to 24 Seven Office within the journal entry, and ensure that the VAT amount calculation happens correctly within the accounting platform.

Also please note that the above-mentioned VAT/Tax ledger accounts should **not** be created in your MEWS environment.

**4.6 Please let us the General Journal Code**

The accounting connection between MEWS and Unit4 will transfer journal entries to the General Journal Code as provided by you. In Unit4, a Journal Code can consists of numbers or letters.

**4.7 Please let us the Sales Journal Code**

The accounting connection between MEWS and Unit4 will transfer sales entries to the Sales Journal Code as provided by you. In Unit4, a Sales Code can consists of numbers or letters.

**4.8 Please provide us a Fallback ledger account for revenues.**

Please see the fallback ledger accounts article for a detailed explanation regarding the fallback ledgers.

**4.9 Please provide us a Fallback ledger account for payments.**

Please see the fallback ledger accounts article for a detailed explanation regarding the fallback ledgers.

The below summarizes the required accounting information described above.

| |
|---|
| **Accounting flow: Closed or Consumed?** |
| **Guest ledger account** |
| **Accounts Receivable Information to be included: Yes or No** |
| **Unit4 Oauth link** |
| **VAT codes** |
| **General journal code (for Journal Entries)** |
| **Sales journal code (for Sales Entries)** |
| **Fallback ledger account for Revenues** |
| **Fallback ledger account for Payments** |

# PART 5: Reconciliation of accounting data sent to Unit4

## Reconciling Journal entries

**In case the integration runs on a Closed accounting flow based on journal entries or Consumed accounting flow,** MEWS accounting data can be reconciled with the journal entries in Unit4 as sent over by the Omniboost accounting integration **by looking at the MEWS _Accounting Report_.**

**Please note that by default, we let the accounting integration extract data from the Accounting report on a 12:00AM to 12:00AM basis. In this case, we therefore consider 12AM to be the end-of-day for your hotel.**

In case you would prefer a different end-of-day (for example 02:00AM, which means that we extract data from the Accounting report on a 02:00AM to 02:00AM basis) please reach out to your Omniboost contact person.

In case the integration uses a Closed accounting flow (based on journal entries), you should run the Accounting report as follows:

- Mode: Closed
- Date filter: based on the closing date

In case the integration uses a Consumed accounting flow, you should run the Accounting report as follows:

- Mode: Consumed
- Date filter: based on the consumption date

Please note that the MEWS _Accounting report_ shows revenues (and payments) based on an accounting category level.

# PART 6: Other features and configurable items of the accounting integration

Please find below an overview of configurable items and features that the MEWS to Unit4 integration can support. In case you would like to use any of these features, please reach out to your Omniboost contact or support@omniboost.io in general.

## Configurable variables

**1. The name of the Journal Entry sent over to Unit4**

Please reach out to your Omniboost contact person in case you would like to change the daily journal entry name that arrives in your Unit4 environment.

## Features

**1. Sending over credit card commission fees separately to Unit4**

Generally, credit card providers (for example Visa, Mastercard, etc.) charge small percentage fees on credit card transactions that they process. Credit card payments in the MEWS accounting report to which these fees apply, can therefore be considered as gross payment amounts. The actual amount that you will receive on your bank account, is slightly smaller than this gross payment amount.

_Gross payment amount = Net payment amount (as received on your bank account) + credit card fees_

The Omniboost accounting integration is able to split out the credit card fees from the gross payment amounts and to post these credit card fees on a ledger account specified by you. In case you would like to use this feature, please reach out to your Omniboost contact person and provide us the ledger account to which the integration can post the credit card fees.

**Please note** that the credit card fees sent over by the Omniboost accounting integration, are _estimates_ of the actual commission fees. Therefore, the final commission fees can differ slightly from the estimated credit card commission fees.

**2. Skipping revenues and/or payments**

In case you want certain revenue or payment items not to be included in the export file, please let your Omniboost contact person know which items these are. We can skip revenue and/or payment items based on the ledger account code which is mapped to an accounting category in MEWS. In other words, we can skip revenues and/or payments on the accounting category level.

**3. Send over revenues in a more (or less) detailed way**

By default, the accounting integration will aggregate revenues belonging to the same accounting category to one (1) line in the export file. If you prefer to include the revenues in a more detailed way, please reach out to your Omniboost contact person.

**4. Send over payments in a less (or more) detailed way**

By default, the accounting integration includes every payment from the Accounting report as a single individual line in the export file. If you prefer to include the payments in a less detailed way, please reach out to your Omniboost contact person.

**5. Currency Conversion**

In case the default currency in your MEWS PMS environment differs from the default currency in your Unit4 environment, please let us know. We can apply a currency conversation rate in the accounting integration. Please note that this is a fixed rate conversation and not a real-time one.