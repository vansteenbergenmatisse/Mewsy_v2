# Onboarding Guide | Mews to Accounting

This guide will walk you through the essential steps to successfully connect your Mews environment with your accounting software

**Mews – Accounting Integration Onboarding Guide**

Welcome to the Mews – Omniboost Accounting Integration onboarding process!

## Step 1: Request your accounting connection

Omniboost offers a variety of accounting integrations tailored for Mews users. To explore your options, log in to your Mews account, navigate to the **Marketplace** in the main menu, and select the **Accounting** section. Here, you'll find a comprehensive list of available accounting integrations, as shown below.

If you have a specific system in mind, utilize the **Search** bar located in the top-left corner to quickly locate it. Once you've identified your desired connection, click **Explore** to access more detailed information.

**Important Note**: This guide pertains exclusively to accounting connections supported by the Omniboost team. To confirm that your chosen connection is provided by us, look for the word **Omniboost** beneath the connection name and in the description, as illustrated in the Xero example below.

**Connection Overview**

On the connection page, you can find:

1. Supported accounting flows
2. Onboarding expectations

Before you proceed with the onboarding process, ensure that both your Mews and accounting software environments are fully configured. Incomplete setups may delay your go-live date.

For guidance on configuring your Mews environment, refer to **Part 1: Configure Your Mews Accounting Setup** in our help article here (https://help.omniboost.io/en/articles/6585772-configure-your-accounting-setup-in-mews-pms-and-choose-your-accounting-flow).

## Step 2: Initiate the onboarding process

To begin your Omniboost accounting integration onboarding, click the **Connect Integration** button shown in the top-right corner of the screenshot above.

Upon submitting your request, you will see the confirmation message shown below, indicating that your request has been officially logged. A new Mews access token will be generated and sent to the Omniboost team for your onboarding.

Click **OK** to dismiss the confirmation. Our team will prepare your onboarding, and you'll receive further instructions in your inbox shortly.

**Note**: Onboarding instructions will always be sent to the email address associated with your Mews profile used to request the connection.

## Step 3: Receive your Omniboost onboarding invitation

Once your profile is established in our Omniboost integration platform, you'll receive an email invitation to commence the onboarding process. This email will include:

- Name of the requested connection (e.g., Mews – Xero)
- Information regarding Mews tiers and related features
- A list of onboarding steps
- A reminder to forward this message to a relevant colleague, such as someone from your accounting team

Once you click the 'Start onboarding' button in the email above, you will proceed through the steps outlined in the following sections of this guide.

## Step 4: Complete your integration onboarding form

**General Information**

In the initial step, you will provide details regarding the accounting flow you wish to utilize. Additionally, you'll need to enter information about your company and the contact details of the individual responsible for the onboarding process.

**Select Accounting Flow**

To configure your connection accurately, it is essential to specify which accounting flow you intend to use. The standard accounting flows include:

- Consumed flow
- Closed flow (Sales Journal)
- Closed flow (Bills & Invoices)

For more information about these flows, click on the linked article in the description in blue underlined text as shown in the image below.

**Company Details and Contact Information**

If you are a new Omniboost client or this is your first integration onboarding, please provide your Mews Chain Name, as this information is not accessible via API.

Property information retrievable by us will be displayed in the Property Section. Please review, update, and complete any incorrect or empty fields.

The contact section should include the main contact person responsible for onboarding and future inquiries.

Once all fields are populated, click the **Confirm and Continue** button in the bottom right corner of the screen.

## Step 5: Terms and conditions

In this step, review and accept the Omniboost Terms & Conditions and Privacy Policy. Clicking **Confirm and continue** in the bottom right corner will save your information and notify the Omniboost onboarding team that your setup is ready for configuration.

## Step 6: Establish a connection with Mews

This step requires the Mews access token generated during your Marketplace request. Omniboost will automatically fill in this information on your behalf, and this step will be skipped if successful.

If there is an issue with your Mews token (e.g., disabled, deleted, or incorrect), the green success box shown above will be red and an error message will be displayed.

Please follow the instructions shown in the blue box at the top of the page to re-establish the connection.

**Note**: A successful connection to your Mews environment is necessary to complete the onboarding process.

## Step 7: Establish a connection with your accounting system

In this step, you will connect to your chosen accounting system. Not all accounting systems require or support an API connection.

**Export-type connections**

For export-type integrations, Omniboost does not require credentials to generate and send your daily or monthly accounting files. Therefore, this step will be automatically skipped.

**API connections**

If your integration utilizes an API to send information to your accounting software, you'll need to provide additional credentials and permissions. This is typically done through an authentication step, where you'll log in to your accounting system. As shown in the Xero example below, please click the **Connect** button to initiate this process.

You will then be redirected to the login page for your accounting software, where you'll need to sign in with an admin-level user account.

Upon completing the authentication steps, you will be redirected back to your onboarding profile to confirm the success of the connection.

If successful, a green success message will appear. If there's an issue, a red message will explain the problem. Double-check your credentials, and if issues persist, consult your accounting system administrator before contacting [support@omniboost.io](mailto:support@omniboost.io).

Some systems may require you to select a specific tenant or environment as shown above; others may not.

Please be aware that the fields and questions displayed on your screen may vary from those shown in this example for each software. Kindly complete them by following the provided tooltips and instructions.

## Step 8: Configure Integration Settings

During this step, you will answer integration-specific questions, such as where to post guest ledger and fallback information.

**Export-type integrations**

For export-type integrations, enter the required values into the available fields. Hover over the information tooltip icon for clarification on specific fields, as shown below.

**API integrations**

If connected to your API accounting system, dropdown menus for certain fields will be available, populated with information from your accounting software (e.g., chart of accounts, tax rates). Select the appropriate values from the options provided.

After completing all required fields, click **Confirm and continue**.

**Note**: The Omniboost team is here to assist with any technical issues, such as forms not opening or fields not saving. However, questions regarding which values to select should be directed to your colleagues or accounting team, who are best equipped to make these decisions.

## Step 9: Complete your accounting mapping

In this step, you will map your Mews accounting categories and taxes.

**Note**: The Omniboost team can assist with technical issues, but for questions on which values to select, please consult your accounting team.

**Accounting categories**

As the description, shown in the blue box at the top of the screen, explains, the mapping of your accounting categories is done in Mews and will be displayed here for your review. Ensure that all information in the blue box is correctly configured in Mews. If any required fields are empty, return to your Mews environment to update them; you will not be able to proceed without completing this step.

**Taxes**

At the bottom of the page, you will find the Taxes section, listing all taxes retrieved from your Mews environment. For each tax listed, select the corresponding value from your accounting system.

Once all fields are completed, click **Confirm and Continue.**

## Next steps

After completing your onboarding form, you'll be redirected to a page outlining the next steps. The Omniboost onboarding team will use the information you provided to configure your new integration pipeline.

**Testing and reconciliation**

Once the setup is complete, a test export file or journal will be generated for your review. The Omniboost team will reach out to confirm that the mapping meets your expectations and that the information reconciles with your Mews Accounting Report.

For assistance in reconciling your test and all subsequent data post-go-live, refer to the following help articles:

- Reconciling based on your chosen accounting flow (https://help.omniboost.io/en/articles/6585772-configure-your-accounting-setup-in-mews-pms-and-choose-your-accounting-flow): Instructions for running your Mews Accounting report based on your selected accounting flow. (Make sure to check **Part 2**.)
- Understanding the Guest Ledger Account (https://help.omniboost.io/en/articles/6593186-understanding-the-guest-ledger-account-in-mews-pms-to-accounting-connections): Information on reconciling the Guest Ledger account posting for Consumed accounting flows (and some Closed accounting flows).

**Go-live and historic data push**

Once you give final approval for the integration's configuration and operation, the Omniboost onboarding team will set the connection live. Data will automatically flow into your accounting software at the agreed intervals (daily, monthly, etc.).

If you require historical data to be pushed from Mews to your accounting system, this can be arranged. The extent of historical data push is dependent on your Mews Tier. More information on available features for each tier can be found via this link (https://omniboost.io/mews-integration-tiers).

**Integration management and support**

After your connection is live, you can manage integration mapping or settings via your Omniboost integration platform profile. The Omniboost support team will be notified of any changes and will review them before release.

For any inquiries regarding the integration or issues you encounter, please contact our support team directly from your Omniboost integration profile using the support popup in the bottom right corner, as shown below.

Alternatively, reach out via email at [support@omniboost.io](mailto:support@omniboost.io).