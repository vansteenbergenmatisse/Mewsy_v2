# Setting up your AFAS Connectors

This article outlines the setup required to support all AFAS accounting integrations.

### How to create API connectivity within AFAS

First thing we need to take into account is that within AFAS there is a distinction between sending data to an environment and retrieving data from an environment. To send data to AFAS we use UpdateConnectors. To retrieve data from AFAS we use GetConnectors.

#### UpdateConnectors

UpdateConnectors are native to AFAS, these do not have to be created/uploaded by the customer. They will have to be selected during the creation of the AppConnector which will be explained later.

The two UpdateConnectors we need to be able to send data to AFAS are the following:

1. Financiële mutatie (connector ID: FiEntries). This UpdateConnector is used to add financial mutations to the ledgers in AFAS.
2. Verkooprelatie organisatie (connector ID: KnSalesRelationOrg). This UpdateConnector is used to add/update debtor information in AFAS.

#### GetConnectors

GetConnectors are not native to AFAS and provide users of the platform the freedom to create these connectors for their specific use case. These are used to retrieve/check debtor information and whether it already exists in AFAS or not.

## **Setting up the Omniboost GetConnectors**

For the correct processing of debtors, Omniboost has created two GetConnectors that we require to receive information from AFAS (**OMNI\_countries** and **OMNI\_sales\_relation**, see attachment). These must be added to the AFAS environment.

A description of this process can be found in the following article:

https://help.afas.nl/help/NL/SE/App_Cnnctr_ImpExp.htm

## **Creating the Omniboost AppConnector**

The next step is to create the AppConnector for Omniboost.

This process is described in the following article:

https://help.afas.nl/help/NL/SE/120718.htm

During **Step 6** in the article, the aforementioned GetConnectors must be added.

During **Step 8**, the following UpdateConnectors must be selected:

- **Financial mutations** (connector ID: `FiEntries`)
- **Sales relation organization** (connector ID: `KnSalesRelationOrg`)

In **Steps 9 and 10**, it is important to copy and save the token as it is necessary for Omniboost to transmit your financial data to AFAS once your integration has been built. You will be asked to provide this information during your Omniboost onboarding.