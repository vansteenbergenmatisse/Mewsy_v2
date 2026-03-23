# Onboarding Guide | MEWS to Basware Invoicing

This article provides details on the MEWS PMS to Basware Invoicing integration. This integration transfers data from MEWS to Basware Invoicing via an SFTP-connection.

**PART 1**: General setup process of the integration

**PART 2**: Information necessary to build the MEWS to Basware integration

**PART 3**: Invoice transfer from MEWS to Basware and integration logic

# PART 1: General setup process of the integration

The start-to-end process of the MEWS to Basware integration goes as follows:

1.1 **Request the Basware integration from the MEWS Marketplace**

Omniboost will automatically receive the integration request and consequently reach out to you.

1.2 **Provide the necessary information to Omniboost**

Please see PART 2 of this article.

1.3 **Omniboost to build the Basware integration**

Once the required information is available, the Basware integration can be setup by your Omniboost contact person within several business days.

1.4 **Integration to be activated by Omniboost**

Once the MEWS to Basware connection has been built, your Omniboost contact person can activate the integration as soon as you want. This means that the integration will fully automatically send over invoices from MEWS into Basware.

# PART 2: Necessary information

In order to correctly transfer invoices from MEWS to Basware, several pieces of information are required. Please find those items below and provide them to your Omniboost contact person.

- Your hotels' Basware Company Name
- Your hotel's address, including:
  - Street name
  - Postal code
  - City
  - Country
  - VAT Number
  - Basware Company ID
- The Basware FTP Server details, including:
  - Domain / IP Address
  - SFTP Port
  - SFTP Username
  - SFTP Password

Please note that Omniboost will handle the provided Basware information with confidentiality.

# PART 3: Guest Information transferred from MEWS to Basware

Please find more information on the invoice data transfer from MEWS to Basware below:

- Every **15 minutes,** (new) invoices that have been created in MEWS will be sent over to Basware.

- The integration only sends over **invoices**. So, no bills are sent over from MEWS to Basware.

- Please note that not **all invoices** from MEWS are sent over to Basware. Instead, there is a logic in place within the connection which checks the availability of a value in the Tax Identifier field in the Company profile in MEWS.

  - More specifically, here we are referring to the MEWS Company profile which is attached to the invoice.

- **The logic itself is as follows:**

  - In case a value is entered in the Tax Identifier field of the MEWS Company profile, the invoice is sent over to Basware.
  - In case there is no value is entered in the Tax Identifier field of the MEWS Company profile, the invoice is **not** sent over to Basware.

- So, the **first step** within the connection logic is to confirm whether an invoice should be pushed over to Basware or not.

- **The second step** for the connection is to **validate** the Tax Identifier number which is entered in the Tax Identifier field in the MEWS Company profile. A Norwegian Tax Identifier number should consists of the prefix 'NO' followed by a 9 Digit ID. **This second step logic works as follows:**

  - If the NO + 9 Digit Identifier is entered > All is good, the invoice can be sent to Basware without any problems.
  - If the NO + 9 Digit Identifier is not entered > The invoice cannot be sent to Basware, **however:**
    - Omniboost has implemented a logic within the connection which checks whether the country code NO is included before the 9 Digit identifier. If not, then the connection automatically adds the NO prefix and still sends over the invoice to Basware.

- The MEWS to Basware connection by Omniboost sends over invoices through connection with the the Basware SFTP server.