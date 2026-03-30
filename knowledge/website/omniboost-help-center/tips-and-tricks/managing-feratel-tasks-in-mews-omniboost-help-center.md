# Managing Feratel tasks in Mews

The Mews/Feratel integration can only work properly when the guest details are entered properly in Mews. If any required field is missing, the reservation(s) can't be created in Feratel. Whenever this happens a task is created in Mews with a report why the reservation can't be created in Feratel.

The property should monitor the tasks queue in Mews and should take the proper actions to modify the reservations and customers so they _can_ be synced with Feratel. When this isn't done, not all reservations are synced and this can lead to fines.

The tasks queue can be found on the dashboard.

Or in the menu under the item 'Tasks'.

Whenever appropriate action is taken the task can be closed.

The task queue is updated in (semi) realtime. Whenever a reservation is edited it get's synced with Feratel and within a few minutes the task queue will be updated if there are any required fields missing.