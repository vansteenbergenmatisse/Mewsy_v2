# Understanding the Accounting Editable History Window Dynamics

#### **The Accounting Editable History Window (AEHW) settings in your MEWS PMS environment will determine at what time the Omniboost Accounting connection will send over (Accounting) entries from the PMS into your Accounting platform.**

**Please note:**

If your integration has ledger entries; AEHW is not applicable!

#### **This article explains the dynamics between:**

- The Accounting Editable History Window (AEHW) in MEWS, and
- The transfer of PMS entries into your Accounting platform by the Omniboost Accounting Connection

---

## 1. Finding the Accounting Editable History Window

_Menu > Settings > Property > Finance > Accounting Configuration_

The definition of the Accounting Editable History Window is as follows:

_''The period of time that you can modify accounting items after consumption. After this time, items cannot be modified.''_

## 2. Understanding the basic concepts: (Accounting) Items and Services

In the definition above, we see reference to 'items'. In order to better understand the concept of 'items', we also need to understand the concept of 'Services' in MEWS.

First, let us start with Services. Via _Menu > Settings > Services_, we will find an overview of all Services which are setup in a MEWS environment.

Services are always broken down in two sub-categories:

- Bookable Service(s)
  - For example, Stay or Accommodation.
- Additional Service(s)

The above means that in case a Service is not a Bookable service, it automatically is an Additional service, and vice versa.

Now, let us move back to the concept of 'items'.

An item is any product or service belonging to a Bookable Service or Additional Service. In the next part of this article, we refer to 'Accounting items' rather than just 'items' because the Omniboost accounting connection mostly pushes Accounting entries from the PMS to your Accounting platform.

## 3. Understanding Services, Accounting Items within Services, and the AEHW offset time

With 'offset time' we are referring to the time at which the Accounting Editable History Window becomes applicable to an Accounting item. In other words, at what time does the Accounting Editable History Window gets 'activated' on an Accounting Item?

The key rule for understanding the effect of the Accounting Editable History Window on Accounting items, is the one below:

- Bookable Service(s)
  - All Accounting Items that belong to the Bookable Service(s), have the PMS Arrival time as the offset time for the Accounting Editable History Window.
- Additional Service(s)
  - All Accounting Items that belong to the Additional Service(s), have midnight (i.e. 12AM) as the offset time for the Accounting Editable History Window.

The PMS Arrival time can be looked up in your MEWS environment as follows:

_Menu > Settings > Services > select the **Bookable** service._

Then scroll down to the Reception part.

If we visualize the above logic in a table:

| **MEWS Service** | **AEHW Offset Time** | **What exact time is this?** |
|---|---|---|
| Bookable Service | MEWS Arrival Time | Depending on the Arrival Time settings in the PMS |
| Additional Service | Midnight (12AM) | 12AM by default |

In the above table, we can clearly see that the Accounting Editable History Window offset time is later for Accounting Items under Additional Services (12AM) than it is for Accounting Items under Bookable Services (MEWS Arrival Time).

The length of the Accounting Editable History Window is the same for all Accounting Items, no matter under which Service an Accounting Item falls. This means that Accounting items belonging to an Additional Service can be modified to a later point in time than Accounting Items which belong to a Bookable Service.

In other words:

- The Accounting Editable History Window ***offset time*** is different between Bookable Services and Additional Services.
- The Accounting Editable History Window ***length*** is similar between Bookable Services and Additional Services.

## 4. Timeline Visualization

We can best visualize the above concepts and logic in an image. Please find below.

In this example, we have chosen the following input:

- Arrival Time in MEWS PMS: 15:00 (= 3PM)
- AEHW length: 13 hours
- Day of Accounting Item entry in MEWS: May 13

As was already stated above, Accounting items belonging to an Additional Service can be modified to a later point in time than Accounting Items which belong to a Bookable Service.

## 5. How does the above logic affect the Omniboost accounting connection?

Let us again look at the example of the timeline image above. The Arrival Time is set to 15:00PM in MEWS. In this case, accounting items in the PMS can be adjusted until:

- Accounting items belonging to the Bookable Service(s): 15:00PM + 13 = 04:00AM (the next day).
- Accounting items belonging to the Additional Service(s): 12:00AM + 13 = 13:00PM (the next day).

Now imagine (still taking into account to the above practical example) that the time of sending over accounting data from MEWS PMS to your accounting platform by the Omniboost accounting integration is 06:00AM. This would mean that:

- Accounting items belonging to the Bookable Service(s) **cannot** be modified anymore at the time the integration sends data (06:00AM) because they can only be modified until 04:00AM.
- Accounting items belonging to the Additional Service(s) **can** still be modified at the time the integration sends data (06:00AM) because they can be modified until 13:00PM.

As you can imagine, Omniboost does not want discrepancies to exist between the accounting entries in your PMS environment and the accounting entries that have been sent over to your Accounting platform. This is why we add a delay into our Accounting connections, which ensures that there is always a match between your MEWS accounting entries and the accounting entries sent over to your Accounting platform.

## 6. Understanding the delay scheduled in Omniboost Accounting connections

Generally, the delay with which an Omniboost Accounting connection sends over entries from MEWS to your Accounting platform is determined by adding one (1) day to the AEHW that is set in your MEWS environment.

Please find an overview of the Accounting Editable History Window (as set in MEWS) and the corresponding delay of the Omniboost Accounting connection sending over data to your Accounting platform, below:

| **AEHW in MEWS** | **Omniboost Accounting Connection Delay** | **Practical Example** |
|---|---|---|
| 1 day | 2 days | May 13 entries to be sent over on May 15 |
| 2 days | 3 days | May 13 entries to be sent over on May 16 |
| 3 days | 4 days | May 13 entries to be sent over on May 17 |
| 4 days | 5 days | May 13 entries to be sent over on May 18 |
| 5 days | 6 days | May 13 entries to be sent over on May 19 |
| 6 days | 7 days | May 13 entries to be sent over on May 20 |
| 7 days | 8 days | May 13 entries to be sent over on May 21 |

Please note that it is also possible to set the Accounting Editable History Window to an X number of days and Y number of hours. For example, an AEHW of 1 day and 12 hours.

In case you set an Accounting Editable History Window in MEWS anywhere in between full days, please reach out to your Omniboost contact person. Your contact person will be able to determine and explain the accounting integration delay (as corresponding to the AEHW you set in MEWS) to you.