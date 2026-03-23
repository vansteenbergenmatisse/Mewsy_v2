# Integration types: API vs Financial Export

This article describes the differences between an API and an export type of integration.

1. #### API

API integrations pull relevant accounting information such as revenue, payments and debtor profiles from the source system (PMS, POS, restaurant management etc). What information can be retrieved, how often and in what format is determined by the configuration and the API structure of the source system.

Omniboost transforms this information into the format required by the accounting software. The format of the information can also be impacted by relevant legal requirements as well as the operational accounting flow of the client. Accounting information is most often posted as a daily financial journal but some integrations support the creation of invoices.

2. #### Financial Export

Export-type integrations also retrieve relevant financial information in the same way but , instead of automatically posting it into the accounting software, they convert it into a CSV or TXT file. The format of the file is determined by the import definitions of the accounting system the client uses.

All financial exports created and offered by Omniboost have a standard format that is compliant with accounting standards as well as legal environments of the region it is available in. Any customer-specific deviations from the standardised file are considered additional feature request, are subject to review and may incur additional development charges.

The files are generated on a daily basis and automatically sent to a specified email or sFTP target for the customer to upload into their accounting system. Some financial integrations may support generation of weekly or monthly files. If necessary for their operations, properties can request this as an additional feature.