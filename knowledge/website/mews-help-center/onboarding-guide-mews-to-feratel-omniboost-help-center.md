# Onboarding Guide | MEWS to Feratel

**This article provides details on the MEWS PMS to Feratel integration. This integration transfers data from MEWS to Feratel via an API-connection.**

**PART 1**: General setup process of the integration

**PART 2**: Information necessary to build the MEWS to Feratel connection

**PART 3**: Guest Information transferred from MEWS to Feratel

## PART 1: General setup process of the integration

The start-to-end process of the MEWS to Feratel integration goes as follows:

1.1 **Request the Feratel integration from the MEWS Marketplace**

Omniboost will automatically receive the integration request and consequently reach out to you.

1.2 **Provide the necessary information to Omniboost**

Please see PART 2 of this article.

1.3 **Omniboost to build the Feratel integration**

Once the required information is available, the Feratel integration can be setup by your Omniboost contact person within several business days.

1.4 **Integration to be activated by Omniboost**

Once the MEWS to Feratel connection has been built, your Omniboost contact person can activate the integration as soon as you want. This means that the integration will fully automatically send over the guest details from MEWS into Feratel.

## PART 2: Necessary information

In order to correctly transfer the guest details from MEWS to Feratel, several pieces of information are required. Please find those items below and provide them to your Omniboost contact person.

- A Feratel username
- A Feratel password
- A Feratel login link
- The Feratel Oestat number
- The Feratel Betrieb number
- Are the Feratel Gastekarten enabled in your Feratel environment? (Yes or No)

Please note that Omniboost will handle the provided Feratel information with confidentiality.

## PART 3: Guest Information transferred from MEWS to Feratel

Please find more information on the guest data transfer from MEWS to Feratel below:

- **Will every guest be sent from MEWS to Feratel?**

  Yes. Every guest that is part of a reservation in MEWS will be sent over to Feratel.

- **What information (beside the guest name) is sent over to Feratel?**

  Please note that this is depending on which info is entered in the MEWS profile of the guest.

  Information includes:

  - Guest type (child or adult)
  - First name
  - Last name
  - Country
  - Postal code
  - Address
  - Nationality
  - City
  - Birth date
  - Email address

- **Which information fields are required to enter in the guest's profile in MEWS?**

  Not many of the MEWS guest profile fields are required to be entered for a guest to be sent over to Feratel. This is because Omniboost has built a so-called 'fallback' value mapping within the connection itself for most of the guest information fields.

  A fallback value is a value which is selected by default once an information field in the MEWS guest profile is missing. Please find below an overview of these fallback values.

  | Information field | Fallback value |
  | --- | --- |
  | Guest type | N/A |
  | First name | Vorname |
  | Last name | Name |
  | Country | AT |
  | Postal code | N/A |
  | Address | Ort |
  | Nationality | AT |
  | Street | Strasse |
  | City | Plz |
  | Birth date | 1980-01-01 |
  | Email address | N/A |

  **Even though a fallback value mapping is implemented within the MEWS to Feratel connection, Omniboost still advices you to enter as much guest details as possible within the MEWS guest profiles.**

- **Is an error message generated in case a guest cannot be sent over to Feratel?**

  In rare cases, it can occur that a guest's details are not sent over into Feratel. Whenever this happens, a _task_ is created in MEWS with a report showing why the guest details cannot be sent over to Feratel. The property should monitor the Tasks queue in MEWS and should take the proper actions to modify the reservations and guests so they can be synced with Feratel accordingly.

- **Is it possible to have missing guest profiles in Feratel whilst not receiving an error message?**

  This could happen in case there is a guest in MEWS and this guest does not have a stay / reservation assigned to its profile. However, the general rule is that any guest who is part of stay/reservation in MEWS should be sent over to Feratel.

- **Is it possible that guest profiles are sent over twice to Feratel (in the new flow)?**

  It should not be able for a guest profile to be sent over twice from MEWS to Feratel. In case this happens, please note your Omniboost representative immediately, as it could mean that there is a bug in the integration.

- **Does the integration automatically synchronize guest profile data from MEWS to Feratel once guest profile data is updated in MEWS?**

  Please note that our integration is not allowed to synchronize guest data from MEWS to Feratel once a guest has checked out its stay in MEWS. This means that the integration can only synchronize guest profiles of those guests that are still checked-in in MEWS.

  Another important point here is that the integration is only allowed (by Feratel) to update / synchronize guest profile data of already sent-over guests in case the First name, Last name, or Birth date of this guest is adjusted as well.

- **When does the integration send over guest profiles (and updates of guest profiles) to Feratel?**

  This happens (almost) real-time. Every few minutes the integration checks which guest (profiles) have been added in MEWS or adjusted, and sends the information over to Feratel accordingly.

- **Is it possible to manually adjust guest profiles / cards in Feratel?**

  You can indeed do so in Feratel (please note that Omniboost cannot do so). Please note that once you have done a manual adjustment to a guest profile in Feratel, the Omniboost integration is not able to synchronize any data for this guest profile anymore.

- **What if a new range of guest numbers is required?**

  In case new guest numbers are required, they should be added to the Feratel environment of the client. Please note that Omniboost does not do this. Our integration will automatically recognize and include the new range of guest numbers into the integration.

- **Can guest cards be printed right out of MEWS?**

  No, this is not possible.

- **Can guest cards be created in Feratel (through our reservation)?**

  Yes, we can enable creating 'Gaste Karten' in the integration.

- **Once guest have checked out in MEWS, do they also get checked out in Feratel?**

  Once a guest is set as checked-out in MEWS, this is recognized by the integration. Therefore, Feratel will also recognize this guest as being a checked out guest.