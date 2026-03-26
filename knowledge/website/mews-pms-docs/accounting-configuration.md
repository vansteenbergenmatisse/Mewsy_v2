# The accounting configuration in Mews Operations: An overview of the settings

The accounting configuration in Mews Operations involves setting up and managing financial accounts, configuring payment methods, and handling revenue and expenses. You can use the accounting configuration in Mews to view and update all your enterprise-level accounting settings to ensure accurate financial reporting and compliance. This setup is crucial during the initial implementation phase or whenever financial policies or payment methods change. Proper configuration streamlines financial operations, enhances accuracy, and ensures a seamless flow of financial information.

In this article you can learn about:

- Viewing and updating the accounting configuration
- Overview of the accounting configuration settings:
  - Options
  - Pricing
  - Tax precision
  - Accounting editable history window
  - External payment types
  - Invoice payment request configuration
  - Invoice payment methods
  - General settings:
  - Invoice due interval
  - Tax rounding correction
  - Tax rate codes
  - Default invoice counter
  - Cash payment
  - Invoice payment
  - Unspecified card payment
  - Bill header
  - Bill footer
  - Fixed footer
  - Address position
  - Top print margin for bills
  - Side print margin for bills
  - Bottom print margin for bills
  - Additional tax identifier
  - Company name
  - Account number
  - Bank name
  - IBAN
  - BIC
  - Accounting categories:
  - Cash payment
  - Invoice payment
  - Unspecified card payment
  - Additional expenses
  - Gateway payments
  - Mews Terminal payments
  - External payments
  - Alternative payments
  - Billing management
  - Bill closing
  - Allow modifying closed bills
  - Split VAT summary by classification
  - Tax declaration on deposits
  - Separate deposits on bill

# Viewing and updating the accounting configuration

To view the accounting configuration and update your settings:

1. In Mews Operations, go to the main menu > **Settings** > **Property** > **Finance**.
2. Click on **Accounting configuration**.
3. Click **General settings** or **Accounting categories**.
4. Update all relevant fields. See the table below for a detailed explanation of the fields.
5. Click **Save**.

# Overview of the accounting configuration settings

## General settings

Fields marked * are mandatory.

| Field | Description |
| --- | --- |
| ### Options | - Select Display employee name on bills and invoices if you want bills and invoices to list the name of the employee who issues them.<br>- Select Optional credit card payment details if you don't want to require Receipt identifier details when posting manual card payments, to speed up the check-in /check-out process.<br>- Select Receivable tracking enabled to enable payment tracking for outstanding invoices and their respective due dates.<br>- Select Require accounting category setup to require all products and services to be connected to an accounting category when created.<br>- Select Group taxes on the bill to group matching taxes on the bill or invoice. **Note**: This option displays only for legal environments with multiple taxes. |
| ### Pricing* | Mews supports both **net** and **gross** pricing:<br>- For **net** pricing, the price you set up for a product or service is the cost before taxes. Mews shows the final price as the net amount plus tax.<br>- For **gross** pricing, the price you set for a product or service is final and already includes tax.<br>**Note**: Mews sets your pricing strategy when building your property, and it is not possible to change it later. |
| ### Tax precision | **Note:** This option is not available for properties based in the US.<br>- Enter the number of decimal places for tax calculations.<br>- Depending on your accounting preferences, you can also choose a higher number for increased precision in tax calculations.<br>- Leave this field blank to use the default rounding precision, defined by the coins and banknotes available in your accounting currency. **Note:** If you change your tax precision, it affects the tax calculations from that point onward but does not affect calculations before the change. |
| ### Accounting editable history window | The accounting editable history window (AEHW) is a setting that determines how far back in time you can modify accounting items.<br>- This window only allows you to modify items on open bills.<br>- You cannot modify reservations with items on closed bills.<br>- To make corrections to a closed bill, you need to rebate that bill. |
| ### External payment types | Choose the external payment types you want to accept at your property.<br>**Note:**<br>- The available external payment types may vary depending on your legal environment.<br>- In France, the Unspecified external payment type is unavailable for selection. |
| ### Invoice payment request configuration | Uncheck the **Add payment request link** box to remove the secure payment link Mews embeds directly in issued invoices. |
| ### Invoice payment methods | Click to select the preferred payment methods you make available to customers paying through the secure payment link Mews embeds directly in issued invoices. |
| ### Invoice due interval | Enter the number of days for settling an invoice after issuing it. |
| ### Tax rounding correction | **Note**: Applying tax rounding correction on bills is available for properties using gross pricing that are not in the DACH region.<br>- **Apply tax rounding to**: Choose if you want to apply tax rounding correction for all or no bills.<br>- **Tax rounding adjustment label**: Enter the text label you want to show on bills and invoices. If empty, any non-zero rounding correction appears next to the default "Round-off" label.<br>Once enabled, the system automatically applies tax rounding correction to all newly issued bills and invoices. |
| ### Tax rate codes | Enter a code for each tax rate to map it to your external accounting software. |
| ### Default invoice counter | Choose the counter you want to automatically apply to every invoice. Counters **do not** automatically appear on invoices unless you select this option.<br>**Note:** You can select a different counter if necessary, when you review the invoice before issuing. |
| ### Bill header | Enter your custom header in HTML that appears at the top of all bills. |
| ### Bill footer | Enter your custom footer in HTML that appears at the bottom of all bills. |
| ### Fixed Footer | Footer text displays at the bottom of each page of the bill. Ensure the bottom margin is set to accommodate the height of your footer. |
| ### Address position | To set the invoice address position, select one of the following from the dropdown menu:<br>- Top left<br>- Top right |
| ### Top print margin for bills | Choose how large you want the top margin to be, in millimeters. |
| ### Side print margin for bills | Choose how large you want the left and right margins to be, in millimeters. |
| ### Bottom print margin for bills | Choose how large you want the bottom margin to be, in millimeters. |
| You can add the following accounting information in every invoice header. **Note:** In France, this information appears in bills, bill previews, invoices, and proformas. | |
| ### Additional tax identifier | Enter the company's additional tax identifier for your external accounting software. |
| ### Company name | Enter your company name. **Note:** In France, the company name is a required field. |
| ### Account number | Enter your bank account number. |
| ### Bank name | Enter your bank name. |
| ### IBAN | Enter your bank IBAN. |
| ### BIC | Enter your bank BIC. |

## Accounting categories

Fields marked * are mandatory.

| Field | Description |
| --- | --- |
| ### Cash payment | Select the accounting category for cash payments. |
| ### Invoice payment | Select the accounting category for invoice payments. |
| ### Unspecified card payment | Select the accounting category for any card payment via terminal. **Note:** This option is unavailable for properties based in France. |
| ### Additional expenses | Select the default accounting categories for additional expenses, such as cancellation fees and city tax. |
| ### Gateway payments | Select the accounting categories for online payments with specific card types via Mews Payments. |
| ### Mews Terminal payments | Select the accounting categories for payments with specific card types via Mews Terminal. |
| ### External payments | Select the accounting categories for each external payment type you accept at your property. |
| ### Alternative payments | If you have enabled the alternative payment type iDEAL at your property, select the accounting category for it. |

## Billing management

Fields marked * are mandatory.

| Field | Description |
| --- | --- |
| ### Bill closing* | From the dropdown menu, click to select:<br>- **Always allowed** if you want to allow closing bills anytime, even on non-consumption of items on them, for example, for a future stay.<br>- **Only with consumed items** to allow closing bills only on consumption of the items on them. **Note:** If you select this option, you won't be able to close bills with stay items until the day of departure. After closing the bill, you won't be able to make changes to the reservation it is attached to.<br>- **Only with consumed items half-day window** if you only want to allow closing bills up to 12 hours before consumption of the items on them. **Note**: If you select this option, you won't be able to close a bill with stay items on it until the day of departure. After closing the bill, you won't be able to make changes to the reservation it is attached to. |
| ### Allow modifying closed bills | - Click the slider switch on to reassign and modify bills even after closing them. |
| ### Split VAT summary by classification | - Click the slider switch on to show VAT total by classification in the VAT summary on bills and invoices. This applies to all guest and company bills. |
| ### Tax declaration on deposits | - Click the slider switch on to enable deposits to record prepayments correctly and handle taxes per accounting rules.<br>- Click the slider switch off to remove deposit options and tax handling.<br>**Note**: You can only click the slider switch off if you **do not** have automatic tax deposits enabled on any rate group. If you have automatic tax deposits enabled for at least one rate group, Mews displays an error message. To resolve the issue, first remove the automatic tax deposits from the rate group. |
| ### Separate deposits on bill | - Click the slider switch on to create a separate section for **Deposits** on all your bills. |

You can learn more about creating an accounting category here.