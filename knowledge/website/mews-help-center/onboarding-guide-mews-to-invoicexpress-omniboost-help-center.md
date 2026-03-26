# Onboarding Guide | MEWS to InvoiceXpress

Working of the integration and features

This article will explain what needs to be done to set up your integration between MEWS and InvoiceXpress and will also explain how the integration works.

## Setting up the integration

In this section we will explain how you can setup your InvoiceXpress account so it is ready to connect via our integration.

1. We need an API key to be able to connect to your invoiceXpress account. This can be created in InvoiceXpress via "Conta" > "API". Once created you will get ACCOUNT_NAME and API_KEY. Please send this to our onboarding specialist via email.

2. Setup all the tax rates as used in Mews, which currently for Portugese properties is 0, 6, 13 and 23%. This can be changed in InvoiceXpress via "Configurações" > "Impostos". Please make sure that every tax rate is setup with name (Nome) IVA followed by the percentage amount, so for 6% the name will be IVA6. Also add the percentage (Valor). **Note: If tax rates are not setup properly, InvoiceXpress will take the default tax rate.**

## How does the integration work?

This section will explain what the integration does and what features are included in this integration.

1. We create the customer in InvoiceXpress. Please note: when an invoice is issued to a company we post the invoice to the company in InvoiceXpress. Otherwise we create the guest as a customer in InvoiceXpress and then we create the invoice for that customer.

2. The invoice that is posted in InvoiceXpress is a direct copy of the invoice from MEWS. This means the invoice number is taken from MEWS, all the revenue lines, the correct VAT and the customer that is invoiced. The status of the invoice in InvoiceXpress will be "Final". Please note that we do not send payments to InvoiceXpress.

3. There is an overview available in MEWS which is called "Device Commands". It can be found via "Menu" > "Queues". There you can see an overview of the invoices and the status of that invoice. The status shows you whether an invoice is sent to InvoiceXpress correctly or not. If not, it will show a message with the error. It is very important that you check this every day and fix the errors as soon as possible. When the error is not fixed within 7 days the status changes to "Cancelled" and then you are not able to acces the retry button anymore (see point 4).

4. Whenever there is an error, the integration stops immediately and no more invoices are sent to InvoiceXpress. This is because InvoiceXpress works with sequences that have to be ascending. For example, when we get an error on November 15th and we continue uploading invoices on the 16th it is not possible anymore to send invoices from the 15th in that sequence. Therefore there is a full stop. What happens then is we save the upcoming invoices in our database. The client needs to fix the error and after that restart the integration again. This can be done via the "retry" button next to the error message in the device commands in MEWS. When that invoice is correctly send to InvoiceXpress the rest of the saved invoices will start uploading to InvoiceXpress until all invoices have been sent or a new error occurs. There is a document available as well where you will find the most common errors and how to fix them. When you need help fixing the error please contact support@omniboost.io.

5. Whenever there is an error we also create a task for you in MEWS so you have an extra check.

## Credit invoices

Because InvoiceXpress does not accept negative revenue lines we needed to come up with a solution how we could deal with that. The only possible way of dealing with that is to work with credit notes. Below is an example which explains how this is working in the integration.

For instance, there is an invoice with a total amount of €200. This invoice consists of €250 room charges and there is a rebate, refund or something else that causes a negative line on the invoice for €50. So the total of this invoice is €200. What we do is create a debit invoice for €250 in InvoiceXpress. At the same time we also create a credit note for €50. Both invoices will get the same invoice number from MEWS.

Of course there can also be "normal" credit notes. We post those as a credit note to InvoiceXpress. It is very important that you add the original invoice number to the note field of the credit note in MEWS. That way we know what invoice we should credit in InvoiceXpress. Make sure that the total amount of the credit note is not higher than the original bill because that would cause an error.

## How to check whether the invoices in InvoiceXpress match the invoices in MEWS

There is a way of checking on a daily or monthly basis whether all the invoices from MEWS are correctly send to InvoiceXpress. Below you find the steps to do that.

1. In MEWS go to the "Bills and invoices" report. Select, for example, the 15th of November until the 16th of November. Also hit the checkbox in the options on the right side of the screen and select "load values". When you view the result on your screen you will see total amount of the invoices and bills. Add those together and you have the total for that day.

2. Then, go to InvoiceXpress and go to the tab "Invoices". Then go to "Advanced search" and select the date (15th of November in this example). The last thing to do before hitting search is select the status. Only select Final, Paid and Draft. After doing so on the right side of your screen you will see the total amount of the invoices. This amount should match the amount from MEWS.

3. What to do when there is a difference between both values? What you can do when there are not a lot of invoices, is doing a quick comparison between both overviews. When there is more data you could export both overviews to Excel and do a comparison in there. The most common reasons for differences are shown below:

- There are still invoices pending in MEWS or have an error that needs to be resolved first.
- You have manually cancelled an invoice we have send through.
- Someone has created other invoices in InvoiceXpress besides the MEWS invoices.