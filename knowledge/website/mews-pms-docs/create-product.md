# How to create a product in Mews Operations

In Mews, products are items or offers that you can associate with bookable or additional services, enabling you to offer them to your guests during booking or on-site. Products can have a **Fixed** price, **for example**, €50, or a **Relative** price based on another product, **for example**, 10% of Breakfast and Night. You can create products at any time. For your products to be available to guests, you need to attach them to a bookable or additional service.

You attach products to:

- **Bookable services**: When you want guests to be able to purchase them when making a reservation. _**Note**: You can attach fixed or relative products to bookable services._
- **Additional services**: When you want guests to purchase them on-site. _**Note**: You can only attach fixed products to additional services._

**ⓘ**

**_Note:_** You can access the "Products" section of your bookable service directly from the Mews search bar.

In this article, you can learn how to:

- [Create a product](#link1)
  - [For Bookable services](#link1a)
  - [For Additional services](#link1b)

# Create a product

To create a product, you need to first create the service that you want to attach it to. You also create product categories to organize the products that you offer with your service.

_**Note:** If you require accounting category setup for all services and products that you enabled in your accounting configuration settings, create all the accounting categories related to the product **before** you create the product itself._

## For Bookable services:

1. In Mews Operations, go to the main menu > **Settings** > **Services**.
2. Click **Bookable services**, then click **Products**.
3. Click **Create**.
4. Complete all other relevant fields as explained in the table below.
5. Click **Create**.

_**Note:** The following fields are only visible when you create products to attach to your bookable services or day use bookable services._

| **Field** | **Description** |
|---|---|
| **Additional languages** | In the drop-down, click to select the language you want to add. This creates duplicates of the fields listed below. You can then enter the information again in your selected language. |
| **Name** | Enter the name of the product, **for example**, Beer. |
| **Short name** | Enter a short name for places in Mews Operations with limited space, such as in reports. |
| **Description** | Enter a description you want to list in the Guest Portal, Mews Booking Engine and Mews Kiosk. |
| **Category** | Click to select the product category that the product belongs to, **for example**, for Beer, click **Alcoholic beverages**. |
| **Ordering** | Enter a number to represent the order in which you want Mews to list your products. _**Note**: Lower number positions are higher in the list. **For example**, 0 is higher than 1._ |
| **Image** | Upload an image you want to display for this product. _**Note**: This is visible to guests when purchasing the product in the Guest Portal, Mews Booking Engine or Mews Kiosk._ |
| **Mapping** | Enter a unique identification code to map the product with other systems. |
| **Pricing type** | Click to select: - **Fixed**: To create a product with a fixed price. - **Relative**: To create a product with a price based on or relative to other products. |
| The following fields are visible if you select the "**Fixed**" option: | |
| **Price** | Enter the price of the product, excluding currency symbols. _**Note**: There are some instances where you need to create a product with a negative value. In this case, make sure to select the **Exclude price from offer** option in the Product options field._ |
| **Currency** | Enter the currency for the price of this product. |
| The following fields are visible if you select the "**Relative**" option: | |
| **Percentage** | Enter a positive or negative percentage value you want to add or deduct from the cost of the product that you want this product to be relative to. **For example**, you can add a service charge, such as 15% on top of certain products, or give a selective discount on the accommodation cost, such as -10% from your nightly price. |
| **Value** | Click to select how Mews calculates the product price, this can be **Net value**, **Tax value** or **Gross value**. |
| **Products** | Click to select the products you want to base the relative price on. |
| The following fields are visible for both "**Fixed**" and "**Relative**" products: | |
| **VAT** | Click to select the applicable Value Added Tax or VAT percentage for the product. |
| **Frequency** | Click to select how frequently the guest uses this product: - **Once**: For products guests use a single time, regardless of their stay length or group size, **for example**, a massage. - **Nightly**: For products guests use each night of their stay, regardless of group size, **for example**, parking. - **Per person (nightly)**: For products each guest uses each night of their stay, **for example**, dinner. - **Per person**: For products each guest uses a single time, regardless of their stay length, **for example**, extra towels. - **Hourly or Per person (hour)**: For products with hourly consumption, **for example**, a meeting room booking. _**Note**: This option is only available for products attached to hourly services._ - **Daily or Per person (daily)**: For products with daily consumption, **for example**, bike rentals. _**Note**: This option is only available for products attached to daily services._ - **Monthly Per person (monthly)**: co-working membership. _**Note**: This option is only available for products attached to monthly services._ _**Note**: You cannot map products that you set to charge only **Once** or **Per person** to a channel manager rate._ |
| **Timing** | Click to select when you want to charge this product: - **Before midnight**: To charge the product on the same night the guests use it, **for example**, extra beds. - **After midnight**: To charge the product on the following day, **for example**, breakfasts. - **Reservation end**: To charge the product on the departure date, **for example**, late check out. - **Reservation start**: To charge the product on the arrival date, **for example**, early check in. |
| **Product options** | Click to select the options you want to apply to this product: - **Bill as package**: To bill the product and service it is attached to as a package. This displays the product as one line on the customer's bill but is expandable in internal reporting. - **Create a task when added by a customer through online check-in:** To have Mews create a task automatically when a guest adds this product in the "Make your stay remarkable" section during online check-in. - **Exclude price from offer**: To add the product price on top of the reservation cost after product consumption. - **Offer to customer**: To display this product in the Mews Booking Engine. _**Note**: This is only available for bookable service products._ - **Offer to employee**: To enable your employees to add the product to a guest's bill. - **Selected by default**: To add the product to all reservations by default. _**Note:** When you select the **Offer to customer** or **Offer to employee** option for a **Selected by default** product,_ - _it shows the pre-selected product to the customer or employee, and_ - _provides them with the option to remove it from the reservation._ |
| **Upsells** | Click to select when to offer the product: - **Before check-in**: To offer the product during online check-in in the Guest Portal and Mews Kiosk. _**Note**: You need to disable the option **Offer to customer** in **Product options** also._ - **During check-out**: To allow guests to declare and pay for products they consume during their stay, such as minibar items. _**Note**: To offer your bookable services such as "Parking" to your guests along with their stay reservation during online check-in, configure your "Service promotions"._ |
| **Classifications** | Click to select **City Tax** to create a city tax product. |
| **Charged** | Click to select an accounting category for financial reporting of this product. |
| **Rebated** | Click to select an accounting category for rebates of this product. |
| **Canceled** | Click to select an accounting category for cancellations of this product. |

## For Additional services

1. In Mews Operations, go to the main menu > **Settings** > **Services**.
2. Click **Additional services**, then click **Products**.
3. Click **+ Create**, then click **Product**.
4. Complete all other relevant fields as explained in the table below.
5. Click **Create**.

| **Field** | **Description** |
|---|---|
| **Add translation** | In the drop-down, click to select the language you want to add. This creates duplicates of the fields listed below. You can then enter the information again in your selected language. |
| **Name** | Enter the name of the product, **for example**, Beer. |
| **Short name** | Enter a short name for places in Mews Operations where space is limited, such as in reports. |
| **Description** | Enter a description you want to list in the Guest Portal, Mews Booking Engine and Mews Kiosk. |
| **External name** | Enter the name you want to list in the Guest Portal, Mews Booking Engine and Mews Kiosk. |
| **External identifier** | Enter a unique identification code to map the product with other systems. |
| **Category** | Click to select the product category that the product belongs to, **for example**, for Beer, click **Alcoholic beverages**. |
| **Accounting category** | Click to select an accounting category for this product. The accounting category for Beer is Minibar. |
| **Rebate accounting category** | Click to select an accounting category for rebates of this product. |
| **Canceled item accounting category** | Click to select an accounting category if the product is canceled. |
| **Product options** | Click to select the options you want to apply to this product: - **Bill as package**: To bill the product and service it is attached to as a package. This displays the product as one line on the customer's bill but is expandable in internal reporting. - **Create a task when added by a customer through online check-in:** To have Mews create a task automatically when a guest adds this product in the "Make your stay remarkable" section during online check-in. - **Exclude price from offer**: To add the product price on top of the reservation cost after product consumption. - **Offer to employee**: To enable your employees to add the product to a guest's bill. - **Selected by default**: To add the product to all reservations by default. _**Note**: When you select the **Offer to customer** or **Offer to employee** option for a **Selected by default** product,_ - _it shows the pre-selected product to the customer or employee, and_ - _provides them with the option to remove it from the reservation._ |
| **Promotions** | Click to select when to offer the product: - **Online booking**: To offer the product in the Mews Booking Engine. - **Online check-in**: To offer the product during online check-in in the Guest Portal. _**Note**: You need to disable the option **Offer to customer** in **Product options** also._ - allow guests to declare and pay for products they consume during their stay, such as minibar items. - **Kiosk check-in**: To offer the product during online check-in in the Mews Kiosk. |
| **Classifications** | Click to select **City Tax** to create a city tax product. |
| **Ordering** | Enter a number to represent the order in which you want Mews to list your products. _**Note**: Lower number positions are higher in the list. **For example**, 0 is higher than 1._ |
| **Amount** | Enter the price of the product, excluding currency symbols. _**Note**: There are some instances where you need to create a product with a negative value. In this case, make sure to select the **Exclude price from offer** option in the **Product options** field._ |
| **Currency** | Enter the currency for the price of this product. |
| **VAT** | Click to select the applicable Value Added Tax or VAT percentage for the product. |

This creates a product in Mews Operations.

**Additional resources:**

- How to create a rate with a product included in Mews Operations (https://help.mews.com/s/article/create-a-rate-with-a-product-included)