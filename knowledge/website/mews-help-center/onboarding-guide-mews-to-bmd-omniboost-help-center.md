# Onboarding Guide | MEWS to BMD

This article provides details on the MEWS PMS to BMD accounting integration. The accounting integration transfers data from MEWS to BMD via export files.

**PART 1**: General setup process of the integration

**PART 2**: Determining the preferred accounting flow: Closed flow or Consumed flow

**PART 3**: Finish your MEWS (accounting) setup

**PART 4**: (Accounting) information necessary to build the MEWS to BMD integration

**PART 5**: Reconciliation of export files

**PART 6**: Other features and configurable items

# PART 1: General setup process of the integration

The start-to-end process of the MEWS to BMD accounting integration goes as follows:

1.1 **Request the BMD integration from the MEWS Marketplace**

Omniboost will automatically receive the integration request and consequently reach out to you.

1.2 **Share your preferred accounting flow with Omniboost**

Please see PART 2 of this article.

1.3 **Finish your MEWS (accounting) setup**

Please see PART 3 of this article.

1.4 **Provide the necessary (accounting) information with Omniboost**

Please see PART 4 of this article.

1.5 **Omniboost to build the accounting integration**

Once the preferred accounting flow and required accounting information are available, the accounting integration can be setup by your Omniboost contact person within several business days.

1.6 **Omniboost to send test export files to your accounting department and verification of these files by your accounting department**

Once there is accounting data available in the MEWS Accounting report, the integration is able to generate a test export file(s). These test export files will be sent over to you by email and can be verified by your accounting department. **The file format is perfectly suited for an import into BMD.**

1.7 **Integration to be activated by Omniboost (export files will be sent over automatically to your accounting department)**

Once your accounting department has verified the test export file(s) and the files are correct, your Omniboost contact person can activate the accounting integration. This means that the integration will fully automatically generate and send over the export files to the recipient list of email address(es) provided by you.

# PART 2: Determining the preferred accounting flow: Closed flow or Consumed flow

Before Omniboost can build the MEWS to BMD accounting integration, you need to specify your preferred accounting flow. Please see PART 2 of this article (https://help.omniboost.io/en/articles/6585772-accounting-setup-in-mews-pms-and-omniboost-accounting-flows) named 'Supported Accounting Flows' and let us know which accounting flow you prefer.

# PART 3: Finish your MEWS (accounting) setup

Before Omniboost can test the MEWS to BMD accounting integration, you need to specify finish your MEWS (accounting) setup. Please see PART 1 of this article (https://help.omniboost.io/en/articles/6585772-accounting-setup-in-mews-pms-and-omniboost-accounting-flows) named 'MEWS Accounting setup'.

# PART 4: Necessary (Accounting) information

In order to correctly transfer the accounting data from MEWS to BMD, several pieces of accounting information are required. Please find those items below and provide them to your Omniboost contact person.

**4.1 Do you prefer a Closed or Consumed accounting flow?**

Please see PART 2 of this article.

**4.2 Please provide us a Guest Ledger account code. Please see this article (https://help.omniboost.io/en/articles/6593186-understanding-the-guest-ledger-account) which explains the guest ledger account.**

Please note that the Guest ledger account should **not** be created in MEWS. Instead, please provide us the guest ledger account code so that we can enter it into the accounting integration.

**4.3 Please provide us a Fallback ledger account for revenues.**

Please see this article (https://help.omniboost.io/en/articles/6609704-fallback-ledger-accounts-for-revenues-and-payments) for a detailed explanation regarding the fallback ledgers.

**4.4 Please provide us a Fallback ledger account for payments.**

Please see this article (https://help.omniboost.io/en/articles/6609704-fallback-ledger-accounts-for-revenues-and-payments) for a detailed explanation regarding the fallback ledgers.

**4.5 Do you prefer daily, weekly, or monthly export files?**

**4.6 Please provide us the email address(es) to which we should send the export files.**

Please note that you can provide as many email address(es) as you want.

The below summarizes the required accounting information described above.

| |
|---|
| **Accounting flow: Closed or Consumed?** |
| **Guest ledger account** |
| **Fallback ledger account for Revenues** |
| **Fallback ledger account for Payments** |
| **Daily, Weekly, or Monthly export files** |
| **Email address(es)** |

You might have noticed that we do not request any VAT codes or VAT ledger accounts in case of the MEWS to BMD accounting integration. This is because VAT will be calculated and posted in BMD when the export files are imported.

We advice you to setup MEWS in such a way that accounting items under an accounting category all have the same VAT percentage. Otherwise, it could occur that BMD has difficulties with calculating the correct VAT amounts.

# PART 5: Reconciliation of export files data with MEWS PMS data

**Reconciling the Journal entry file**

The MEWS accounting data can be reconciled with the export files as generated by the Omniboost accounting integration **by looking at the MEWS _Accounting Report_.**

**Please note that by default, we let the accounting integration extract data from the Accounting report on a 12:00AM to 12:00AM basis (as seen in the below images). In this case, we therefore consider 12AM to be the end-of-day for your hotel.**

In case you would prefer a different end-of-day (for example 02:00AM, which means that we extract data from the Accounting report on a 02:00AM to 02:00AM basis) please reach out to your Omniboost contact person.

In case the integration uses a Closed accounting flow, you should run the Accounting report as follows:

In case the integration uses a Consumed accounting flow, you should run the Accounting report as follows:

**Please note that the content of the export file columns and the columns itself are compatible with BMD data import requirements.**

# PART 6: Other features and configurable items of the accounting integration

Please find below an overview of configurable items and features that the MEWS to BMD integration can support. In case you would like to use any of these features, please reach out to you Omniboost contact or [support@omniboost.io](mailto:support@omniboost.io) in general.

## Configurable variables

**1. Daily, Weekly, or Monthly export files**

As mentioned earlier in this article, the integration is able to generate and send over daily, weekly, or monthly export files. In case you would like to change this frequency, please reach out to your Omniboost contact person.

**2. The name of the Journal Entry file**

By default, the file name of the journal entry file is 'EXTF\_(hotel name)'

For example, when a hotel is named 'Hotel XYZ', then the journal entry file name would be 'EXTF\_Hotel\_XYZ'.

Please reach out to you Omniboost contact person in case you would like to change the file name.

## Features

**1. Sending over credit card commission fees separately to BMD**

Generally, credit card providers (for example Visa, Mastercard, etc.) charge small percentage fees on credit card transactions that they process. Credit card payments in the MEWS accounting report to which these fees apply, can therefore be considered as gross payment amounts. The actual amount that you will receive on your bank account, is slightly smaller than this gross payment amount.

_Gross payment amount = Net payment amount (as received on your bank account) + credit card fees_

The Omniboost accounting integration is able to split out the credit card fees from the gross payment amounts and to post these credit card fees on a ledger account specified by you. In case you would like to use this feature, please reach out to your Omniboost contact person and provide us the ledger account to which the integration can post the credit card fees.

**Please note** that the credit card fees sent over by the Omniboost accounting integration, are _estimates_ of the actual commission fees. Therefore, the final commission fees can differ slightly from the estimated credit card commission fees.

**2. Skipping revenues and/or payments in the BMD export files**

In case you want certain revenue or payment items not to be included in the export file, please let your Omniboost contact person know which items these are. We can skip revenue and/or payment items based on the ledger account code which is mapped to an accounting category in MEWS. In other words, we can skip revenues and/or payments on the accounting category level.

**3. Send over revenues in a more (or less) detailed way**

By default, the accounting integration will aggregate revenues belonging to the same accounting category to one (1) line in the export file. If you prefer to include the revenues in a more detailed way, please reach out to your Omniboost contact person.

**4. Send over payments in a less (or more) detailed way**

By default, the accounting integration includes every payment from the Accounting report as a single individual line in the export file. If you prefer to include the payments in a less detailed way, please reach out to your Omniboost contact person.