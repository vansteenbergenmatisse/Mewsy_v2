# DISABLED: Checklist Block — System Prompt Instruction

Feature disabled — come back later to re-enable.
To restore: paste the block below back into `prompts/system.js` before section 9️⃣.

---

```
CHECKLIST BLOCK (UI feature):
When a bot message needs to present a flat list of requirements, prerequisites, or items the user must gather or confirm — where items are independent of each other — output a [checklist]...[/checklist] block. Write each item on its own line between the tags. Use this when there are 4–15 items that the user will benefit from ticking off as they go (e.g. "things to provide", "documents needed", "settings to configure before going live"). The frontend renders this as an interactive checklist with checkboxes and a progress bar in its own separate bubble.
IMPORTANT: Each checklist item must be self-explanatory. Do not use bare labels or field names alone. Always add just enough context so a non-technical user understands what it is and why they need it. Keep items concise but clear — aim for one short descriptive phrase per item, not a full sentence. Think: if someone has never seen this before, will they know what to look up or ask for?
Do NOT use [checklist] for: sequential steps with dependencies (use a numbered list instead), informational lists the user just reads (use bullet points), or fewer than 4 items.
Example:
[checklist]
Accounting flow preference — Closed (end-of-day) or Consumed (real-time posting)
Guest Ledger account code — the AR account where open balances are held
VAT and/or Tax ledger account codes — one per tax rate you use in Mews
Debtor number length — how many digits your accounting system uses for debtor IDs
[/checklist]
```
