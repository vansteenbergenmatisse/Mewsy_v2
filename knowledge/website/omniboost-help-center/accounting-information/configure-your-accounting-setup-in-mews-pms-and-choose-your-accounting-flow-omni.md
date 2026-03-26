# Configure your Accounting Setup in MEWS PMS and choose your Accounting Flow

## Introduction

**PART I**

The first part of this help article guides you in the configuration of your Accounting Setup in MEWS PMS.

A proper Accounting Setup in your PMS environment enables the Omniboost Platform to correctly extract accounting entries from MEWS and accordingly push these entries over to your accounting platform.

**PART II**

The second part of this help article explains the different Accounting Flows which are available on the Omniboost Platform.

Choosing your preferred Accounting Flow ensures that you comply with the Accounting laws and practices of your country.

---

# PART 1: Configure your MEWS Accounting Setup

Omniboost can start configuring your hotel's Accounting Integration with MEWS PMS as soon as your Accounting Setup is correctly configured.

Please find below an overview of the MEWS PMS sections relevant for the accounting integration.

### 1.1 Overview of Accounting Categories

How to find the overview of Accounting Categories:

_MEWS Menu > Settings > Property > Finance > Accounting Categories_

**'Ledger account code' column**

- In the 'Ledger account code' column, a ledger account code should be entered for every accounting category.
  - Please note that every ledger account code that you enter, should also exist in the chart of accounts of your accounting platform.
- Please note that the Omniboost accounting integration will not be able to send accounting entries to your accounting system in case:
  - A ledger account code is missing for any of the Accounting Categories in MEWS (assuming that the Accounting Category is in active use).
  - One of the ledger account codes entered in MEWS is not existing in your accounting platform's Chart of Accounts.

**'Cost center code' column**

- In the 'Cost center code' column, you can enter cost centers (in case you are making use of cost centers in your accounting environment).
  - Please note that Cost centers are most often used to distinguish different revenue streams. In case you do not make use of cost centers, you can leave the values in this column empty.

**Other columns**

- The columns 'Code', 'External code', and 'Posting account code' are - in most cases - not looked up by the Omniboost accounting integration. Therefore, you can leave the values in these columns empty.
  - Please note that in case you would prefer a more detailed accounting mapping on top of ledger account codes and (possible) cost center codes, please reach out to your Omniboost representative.

Please note that you do **not** have to notify Omniboost in case changes to accounting categories and/or ledger account codes and cost center codes are made. This is because the Omniboost Platform will automatically recognize any changes regarding these items in the MEWS PMS environment.

### 1.2 Disable or enable 'Receivable Tracking'

How to find the option 'Receivable Tracking' in the Accounting configuration section:

_MEWS Menu > Settings > Property > Finance > Accounting Configuration_

**Receivable Tracking - Enabled**

- The Receivable Tracking option allows your property to manage Accounts Receivables (A/R) within MEWS PMS.
  - Please note that A/R entries consist of Invoices and Debtors.
  - In case you have Receivable Tracking enabled and you issue an invoice, a so-called 'Receivable invoice payment' is automatically created in MEWS. That Receivable invoice payment can then be found in an Accounts Receivables overview in MEWS. Thus, by enabling Receivable Tracking in your MEWS environment, your property is able to manage Accounts Receivable (or A/R) from within MEWS itself.

**Receivable Tracking - Disabled**

- Please note that enabling the Receivable Tracking option does have consequences for the Omniboost accounting integration. Please find this Omniboost help article (https://help.omniboost.io/en/articles/5106697-dynamics-between-receivable-tracking-in-mews-and-omniboost-accounting-integrations) which explains the possible consequences.
- From the Omniboost (accounting integration) perspective, we would advise to disable the Receivable Tracking option in your MEWS environment in case:
  - You prefer the Omniboost accounting integration to send over A/R entries to your accounting platform.
  - You prefer to manage A/R in your accounting platform rather than in your MEWS PMS environment.

### 1.3 Accounting Editable History Window

How to find the 'Accounting Editable History Window' in the Accounting configuration section:

_MEWS Menu > Settings > Property > Finance > Accounting Configuration_

**The Accounting Editable History Window (AEHW) explained:**

_''The Accounting Editable History Window determines the period of time that you can modify accounting items after consumption. After this time, items cannot be modified.''_

- The specific time until which accounting items can be modified in MEWS PMS, is of crucial important for the accounting integration.
- This is important because the Omniboost accounting integration will also send over your accounting entries from MEWS to your accounting platform at a specific time. Omniboost therefore has to ensure that any accounting entries sent over by the accounting integration, cannot be modified in MEWS PMS anymore afterwards.
- Omniboost will always respect your AEHW settings in MEWS.

**When will you receive accounting entries from the PMS in your accounting platform?**

- The delay with which the Omniboost accounting integration sends over data from MEWS to your accounting platform is determined by adding one day (1 day) to the AEHW that is set in your MEWS environment.
- This means that there will be no discrepancies between the accounting entries in MEWS and the entries in your accounting platform.
- Please find an overview of Accounting Editable History Windows settings (as set in MEWS) and the corresponding delays of the Omniboost integration sending over entries to your accounting platform, below:

| AEHW settings in MEWS | Accounting Integration Delay | Practical Example |
|---|---|---|
| 1 day | 2 days | June 1 entries from MEWS to be received on June 3 |
| 2 days | 3 days | June 1 entries from MEWS to be received on June 4 |
| 3 days | 4 days | June 1 entries from MEWS to be received on June 5 |
| 4 days | 5 days | June 1 entries from MEWS to be received on June 6 |
| 5 days | 6 days | June 1 entries from MEWS to be received on June 7 |
| 6 days | 7 days | June 1 entries from MEWS to be received on June 8 |
| 7 days | 8 days | June 1 entries from MEWS to be received on June 9 |

- Please note that it is also possible to set the Accounting Editable History Window to an X number of days and Y number of hours.
  - For example, an AEHW of 1 day and 12 hours.
- In case you set an Accounting Editable History Window in MEWS anywhere in between full days, please reach out to your Omniboost representative. Your Omniboost representative will be able to determine and explain the accounting integration delay (as corresponding to the AEHW you set in MEWS) to you.

### 1.4 Accounting Setup finalized

Once you have completed your MEWS Accounting setup according to the information in this article, Omniboost can do a final accounting setup check. In order for Omniboost to perform this setup check of your MEWS environment, please create a user for [info@omniboost.io](mailto:info@omniboost.io) with admin rights.

Please note that Omniboost will not make any modifications to your MEWS environment. Any modifications that we recommend to you following the accounting setup check, should be carried out by the hotel itself.

---

# PART 2: Choose your Accounting Flow

There are various Accounting Flows which are supported on the Omniboost Platform.

- (1) A Closed Accounting Flow
  - Option 1: Based on Journal Entries
  - Option 2: Based on Bills and Invoices
- (2) A Consumed Accounting Flow
- (3) A Hybrid Accounting Flow

Please find an explanation and the details of both flows below.

### 2.1 Closed Accounting Flow

In a Closed Accounting Flow, Revenues are accounted for once a guest checks out of the hotel and the corresponding guest bill is closed.

- In case the guest pays the total bill amount at the end of the stay, the entire bill is closed; we then speak of a ***Bill***.
- In case the guest checks out at the end of the stay but does not pay the total bill amount directly (i.e. the guest is allowed to pay the outstanding amount in the future) we then speak of an ***Invoice***.

In a Closed Accounting Flow, the Omniboost accounting integration will extract revenues from the PMS system once a Bill is closed or an Invoice is issued.

This also means that if a guest is not yet checked out of the hotel, and thus the corresponding guest folio is not closed yet, revenues will not yet be extracted.

There are two different options available within the Closed Accounting Flow. Please find the details on these options below.

**Option 1: A Closed Accounting Flow based on Journal Entries**

- In this Closed Flow option, the Omniboost accounting integration will extract closed revenues (and payments) and create a Journal Entry in your accounting platform based on these closed revenues and payments.
- Reconciliation of accounting entries between MEWS PMS and the Journal Entry in your accounting platform happens by running the Accounting Report in MEWS on a Closed type.

Navigate to the Accounting Report:

_MEWS Menu > Reporting > Accounting Report_

Consequently, run the Accounting Report based on the 'Closed' type.

- Please note that by default, Omniboost accounting integrations extract data from the Accounting Report on a 12:00AM to 12:00AM basis.
- By default, Omniboost considers 12AM to be the end-of-day for your hotel.
- In case you would prefer a different end-of-day (for example 02:00AM, which means that data is extracted from the Accounting Report on a 02:00AM to 02:00AM basis) please reach out to your Omniboost representative.

**Option 2: A Closed Accounting Flow based on Bills & Invoices**

- In this Closed Flow option, the Omniboost accounting integration will extract closed revenues (and payments) and send these over as individual Bills and Invoices (together with corresponding Debtor information) to your accounting platform.
- Reconciliation of accounting entries between MEWS PMS and the Bills and Invoices in your accounting platform happens by running the Bills and Invoices Report in MEWS.

Navigate to the Bills and Invoices Report:

_MEWS Menu > Reporting > Bills and Invoices Report_

**Understanding the Accounting Report and Bills and Invoices Report**

- The MEWS Accounting Report shows revenues (and payments) based on an Accounting Category level.
  - The Accounting Report is suited for the Closed Flow based on Journal Entries.
- The MEWS Bills and Invoices Report provides the same information as the Accounting Report, however it does so based on the level of individual Bills and Invoices.
  - The Bills and Invoices Report is suited for the Closed Flow based on Bills and Invoices.

## 2.2 Consumed Accounting Flow

- In a Consumed Accounting Flow, the accounting integration will extract Consumed revenues (and payments) from the MEWS Accounting Report and create a Journal Entry in your accounting platform based on these Consumed revenues and payments.
- As you have read in the previous section of this help article, the Omniboost Accounting Integration can extract Closed entries from the MEWS Accounting Report and create a Journal Entry in your accounting platform based on these Closed revenues and payments. The Omniboost accounting integration can do the same for consumed revenues.
- Reconciliation of accounting entries between MEWS PMS and the Journal Entry in your accounting platform happens by running the Accounting Report in MEWS on a Consumed type.

Navigate to the Accounting Report:

_MEWS Menu > Reporting > Accounting Report_

Consequently, run the Accounting Report based on the 'Consumed' type.

- Please note that by default, Omniboost accounting integrations extract data from the Accounting Report on a 12:00AM to 12:00AM basis.
- By default, Omniboost considers 12AM to be the end-of-day for your hotel.
- In case you would prefer a different end-of-day (for example 02:00AM, which means that data is extracted from the Accounting Report on a 02:00AM to 02:00AM basis) please reach out to your Omniboost representative.

## 2.3 Hybrid Accounting Flow

Accounting laws and practices in some countries require the use of a Hybrid Accounting Flow.

- A Hybrid Accounting Flow is a flow in which the Closed and Consumed Flows are combined.
- One country where a Hybrid Accounting Flow is common, is Spain. Please find this Omniboost help article (https://help.omniboost.io/en/articles/6909222-general-accounting-flow-spain-sage-es) which explains the details of the Spanish Hybrid Flow.
- In case such a Hybrid Accounting Flow applies to your property's situation, please inform your Omniboost representative about this. The specifics of such a Hybrid Accounting Flow can then be discussed during a meeting.

# Summary of Accounting flows

Please find a summary of the different Accounting Flows below:

1. **A Closed Accounting Flow based on Journal Entries**

In this Closed Flow option, the Omniboost accounting integration will extract closed revenues (and payments) and create a Journal Entry in your accounting platform based on these closed revenues and payments.

2. **A Closed Accounting Flow based on Bills & Invoices**

In this Closed Flow option, the Omniboost accounting integration will extract closed revenues (and payments) and send these over as individual Bills and Invoices (together with corresponding Debtor information) to your accounting platform.

3. **A Consumed Accounting Flow**

In a Consumed Accounting Flow, the accounting integration will extract Consumed revenues (and payments) from the MEWS Accounting Report and create a Journal Entry in your accounting platform based on these Consumed revenues and payments.

| **Accounting Flow** | **Closed** | **Closed** | **Consumed** |
|---|---|---|---|
| **Based on** | Journal Entries | Bills and Invoices | Journal Entries |
| **Reconciliation with MEWS Report** | Accounting Report | Bills and Invoices Report | Accounting Report |