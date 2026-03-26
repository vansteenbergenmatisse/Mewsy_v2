# Mews PMS & Omniboost Integration

## <!-- What this file covers: everything about Mews as a product, how Omniboost connects to it, and how to set up and troubleshoot that connection. -->

<!-- What is Mews -->

## What Mews Is

Mews is a cloud-based **Property Management System (PMS)** designed to simplify and automate all operations for modern hotel owners and their guests — covering the booking engine, check-out, reception, and revenue management. It powers 15,000+ customers across 85 countries and has been named Best PMS (2024, 2025, 2026) and Best POS (2026) by Hotel Tech Report. Mews spans PMS, POS, RMS, Housekeeping, and Payments.

### Services & Products

Mews supports two kinds of services:

- **Bookable services** — services guests can purchase when making a reservation, such as accommodation or stay services.
- **Additional services** — services guests can only purchase on-site.

> **Note:** Attach products to a bookable service if you want guests to be able to purchase them at reservation. Attach products to an additional service if you want to restrict purchase to on-site only.

Services and products are always interconnected — you cannot create a product without first creating the service it belongs to. This allows you to set up a pricing system that factors in both the service price and the product price. For example, if you configure a room service with a $5 fee, every order carries that $5 charge on top of the individual product price, regardless of what the guest orders.

---

<!-- How Omniboost and Mews relate to each other -->

## Omniboost's Role with Mews

## Omniboost is the **primary integration partner** for Mews. Most accounting integrations listed in the Mews Marketplace are built and managed by Omniboost. Their role is to facilitate the data connection between Mews and a third-party system — they do not manage the accounting setup on either the Mews or accounting side, and are not responsible for generating chart-of-accounts codes.

<!-- Pricing tiers and what's included at each level -->

## Integration Tiers

Omniboost offers 3 tiers for the Mews accounting integration: **Bronze**, **Silver**, and **Gold**. The right tier depends on the property's complexity, reporting needs, and desired level of support. Full details at: omniboost.io/mews-integration-tiers.

> Note: Not all features are available for every integration due to technical limitations of different accounting systems. Contact Omniboost to confirm exact inclusions for a specific setup.

---

### Bronze Tier

**Best for:** Properties with standard automation needs and no requirement for detailed reporting or hands-on support.
**Pricing:** Included in the Mews subscription — no additional cost.
**Support model:** Support is handled by Mews, not Omniboost. The hotel validates test journals themselves using Omniboost's Help Center.
**Data transfers included:**

- Revenues transferred at the Mews Accounting Category level (aggregated, not detailed)
- Payments transferred at the Mews Accounting Category level (aggregated, not detailed)
- VAT / Tax transfer
- Accounts Receivable (A/R)
  **What Bronze does NOT include:**
- Detailed (non-aggregated) revenue or payment entries
- The ability to skip specific revenue or payment categories
- Credit card fee splitting
- Statistics entries
- Customized journal or line descriptions
- Market segmentation for Accommodation revenues
- Advanced mapping logic
- Any post-go-live reconciliation assistance from Omniboost
- Direct Omniboost email or phone support
  **Onboarding:**
- Mews Accounting Setup Check included
- 7 days of test journals sent to the accounting system
- Self-validation of test journals by the hotel
- No onboarding meetings with Omniboost
  **Post go-live:**
- Historical journal re-send: up to 30 days back from go-live date only
- EOD (End of Day) adjustments available against a one-time fee
- No post-go-live meetings or optimization reviews

---

### Silver Tier

**Best for:** Properties that need more granular data visibility, the ability to skip or split certain entries, and want direct Omniboost support throughout onboarding and beyond.
**Pricing:** €1,600 / £1,600 / $1,950 annually per property.
**Support model:** Direct Omniboost support via email and phone. Omniboost assists with test journal validation during onboarding.
**Data transfers included:**

- All Bronze data transfers (Revenues, Payments, VAT/Tax, A/R)
- Detailed Revenue entries (granular breakdown beyond Accounting Category level, if supported by the accounting connection)
- Detailed Payment entries (granular breakdown beyond Accounting Category level, if supported by the accounting connection)
- Ability to skip (exclude) specific Revenue categories from being sent to accounting
- Ability to skip (exclude) specific Payment categories from being sent to accounting
- Credit card fee split: gross payment amounts are split into net payment + estimated credit card commission, posted to a separate ledger account code
  **What Silver does NOT include (compared to Gold):**
- Statistics entries (Arrivals, Departures, Rooms out of order, etc.)
- Customized journal descriptions
- Customized revenue and payment line descriptions
- Market segmentation for Accommodation revenues
- Advanced mapping logic
- Documentation on demand
- Monthly post-go-live meetings (only quarterly)
- 90-day reconciliation assistance (only 30 days)
- Priority response within 1 business day (only 3 business days)
  **Onboarding:**
- Mews Accounting Setup Check included
- Introduction meeting (30 min)
- Bi-weekly onboarding meetings available on request
- 21 days of test journals sent to the accounting system
- Omniboost assists with test journal validation
  **Post go-live:**
- Historical journal re-send: up to 90 days back (from go-live date and at any point once live)
- Reconciliation assistance available for the past 30 days
- EOD adjustments without additional fees
- Priority support SLA: within 3 business days
- Quarterly meeting availability

---

### Gold Tier

**Best for:** Complex hotel operations, multi-property setups, or properties that require advanced mapping, statistical reporting, full customization, and the highest level of ongoing Omniboost support.
**Pricing:** €2,150 / £2,150 / $2,350 annually per property.
**Support model:** Omniboost priority support. Omniboost assists with test journal validation during onboarding. Fastest guaranteed response SLA across all tiers.
**Data transfers included:**

- All Silver data transfers (Revenues, Payments, VAT/Tax, A/R, Detailed entries, Skip logic, Credit card fee split)
- Statistics entries: statistical data such as Arrivals, Departures, Rooms out of order, Number of guests, and more — if supported by the accounting connection
- Market segmentation for Accommodation revenues: daily room revenues broken down by market segment (e.g. OTA, Leisure, Business, Transient, Government) instead of one aggregated line
- Advanced mapping logic: covers cases where the standard Mews Accounting Category mapping is insufficient — Omniboost can handle additional mapping of ledger accounts, cost centers, and other journal entry elements within the integration itself
  **Customization options (Gold only):**
- Customized journal descriptions: default is "MEWS + Business date"; Gold allows further customization
- Customized revenue and payment line descriptions: default uses the Mews Accounting Category name (e.g. "Breakfast"); Gold allows these to be renamed in the accounting platform
  **Onboarding:**
- Mews Accounting Setup Check included
- Introduction meeting (30 min)
- Weekly onboarding meetings available on request
- One month of test journals sent to the accounting system
- Omniboost assists with test journal validation
  **Post go-live:**
- Historical journal re-send: up to 365 days back (from go-live date and at any point once live)
- Reconciliation assistance available for the past 90 days
- PMS data reconciliation assistance and payment reconciliation support included
- EOD adjustments without additional fees
- Priority support SLA: within 1 business day
- Monthly meeting availability
- Quarterly optimization reviews
- Documentation on demand

---

### Quick Tier Decision Guide

Use Bronze if: the property wants basic automated accounting with no extra cost and is comfortable with self-service support via the Help Center.
Use Silver if: the property needs detailed or selectively filtered data entries, wants Omniboost to handle support and validation, or needs credit card fee splitting.
Use Gold if: the property has complex mapping requirements, needs statistics or market segmentation in accounting, runs multiple properties, wants full customization of journal descriptions, or requires the fastest support SLA and ongoing optimization reviews.

---

<!-- How to start a Mews integration, onboarding steps -->

## How to Start a Mews Integration

1. Log in to Mews → Marketplace → Accounting section → find the desired accounting system → click **Explore** → request the connection.
2. Omniboost sends an onboarding invitation email to the email address linked to the Mews profile used to make the request.
3. The onboarding steps are: accounting flow selection → company/contact info → accept T&Cs → connect Mews token → connect accounting system → complete GL mapping.
4. Omniboost performs a final setup check but makes **no modifications** to the Mews environment themselves. Any recommended changes must be carried out by the hotel.
   > To confirm an integration is managed by Omniboost: look for the word "Omniboost" beneath the connection name in the Mews Marketplace description.

---

<!-- How data is extracted from Mews, what "consumed" or "closed" means, which flow to choose -->

## Accounting Flows

There are three core accounting flows supported by Omniboost for Mews:

- **Consumed** — Extracts revenue and payment data from Mews based on when it is consumed in the PMS. Reconciliation happens via the Mews Accounting Report on a Consumed basis. This is the most common flow.
- **Closed (Journal Entries)** — Captures closed bill revenues including payments from the Accounting Report, and creates a corresponding journal entry in the accounting platform.
- **Closed (Bills & Invoices)** — Individual bills and invoices are shared with the accounting platform as sales entries, including debtor information. Can include or exclude payments tied to closed bills.
- **Hybrid** — A combination of Closed and Consumed flows, required in some countries (e.g. Spain) due to local accounting law.
  > Default extraction window: 12:00AM to 12:00AM. A different end-of-day can be configured by contacting your Omniboost representative.

---

<!-- Duplicate invoices, Receivable Tracking in Mews, accounting sync issues -->

## Receivable Tracking — Critical Setup Rule

## The **Receivable Tracking** option in Mews **must be turned OFF** before activating an Omniboost accounting integration. Location: Mews Menu → Settings → Property → Finance → Accounting Configuration. If left on, Omniboost will pull invoices and create duplicates in both Mews and the accounting system.

<!-- GL mapping, ledger codes, chart of accounts, why the sync isn't sending data -->

## GL Mapping & Ledger Account Codes

## Every **Accounting Category** in Mews must have a **Ledger Account Code** that exactly matches an existing entry in the accounting platform's Chart of Accounts. If any code is missing or does not exist in the accounting system, the sync will fail. Cost center codes can also be added optionally. The columns `Code`, `External Code`, and `Posting Account Code` are generally not used by Omniboost and can be left empty. Omniboost **auto-detects** changes to accounting categories and ledger codes — there is no need to notify Omniboost manually when changes are made.

<!-- How POS transactions get into Mews, room charges, guest pays at a restaurant -->

## POS to Mews Integration

- **Room Charge** — Revenue is charged directly to a guest profile in Mews using their name and/or room number.
- **Check Closure** — A guest's check can be closed using the "Room Charge" payment method without requiring immediate payment at the POS.
- **Guest Lookup** — Staff can search for guests in Mews by name or room number directly from the POS flow.
- **Consolidated Accounting Reports** — All POS transactions automatically land in the Outlets section of the Mews Accounting Report, giving a unified revenue overview.

---

<!-- Whether a specific software is supported, full list of what Omniboost connects to Mews -->

## Supported Systems

### All our Accounting Systems

24SevenOffice, Abacus, AccountView, ADDISON Akte, AFAS Profit, Asperion, Bexio, BMD, Cegid, Cegid Loop, Cegid Quadratus, Ciel, Datev, EBP Accounting, Enova, Exact Globe, Exact Online, Expert M, Filosof, Fortnox, HMD, Hogia, Hotel Investor Apps, Ibiza Software, IPSOA, Oracle JD Edwards, King Software, KPMG, M3, Maventa, Merit, Microsoft Dynamics Business Central, Minox, Oracle Netsuite (Accounting), Octopus, Odoo, Order2Cash, PowerOffice, Procountor, Quadracompta, QuickBooks, Reeleezee, Sage 100 CH, Sage 100 Cloud, Sage 100 FR, Sage 1000 FR, Sage 200, Sage 200 ES, Sage 200 UK, Sage 300 API, Sage 50, Sage 50 C, Sage 50 ES, Sage 50 UK, Sage Bob, Sage Business Cloud, Sage Business One, Sage Coala, Sage ContaPlus, Sage Génération Expert, Sage Intacct, Sage One ZA, Sage PE i7, SAP Business One, SAP Business One ES, SAP S/4HANA, SAP S3, Snelstart, SoftOne, SunAccounts, Tripletex, Twinfield, Unit4, Unit4 Financials, Unit4 Venice, Visma Net, Visma Business, Visma Economic, WinBooks, Xero, Xledger, Yardi, Yuki

### Point of Sale Systems

Ancon, DISH, Epos Now, Gastronovi, Lightspeed G-Series, Lightspeed K-Series, Lightspeed L-Series, MplusKASSA, Oracle Simphony, Resengo, Simphony STS Gen1 (v2.7+), Simphony STS Gen2 (v19.2.1+), Toast, Trivec

### Property Management Systems (PMS-to-Mews)

Fidelio

### Other / Supplementary

## Alice, AVS, Basware, Broadvine, Delphi, Dyflexis, Feratel, Intrum, MailChimp, Ministry of Finance – Republic of Indonesia, Oracle Netsuite (Inventory), Qualtrics, Ropo, SCB, Statistics Norway (SSB), Sunsystems, Woby

<!-- System not in the list, or asking if Omniboost can build a new integration -->

## System Not Listed?

Omniboost is constantly expanding its integration stack. If a system isn't listed, it may already be on the roadmap or launching soon. The user should contact Omniboost directly to request an integration or check current availability.
