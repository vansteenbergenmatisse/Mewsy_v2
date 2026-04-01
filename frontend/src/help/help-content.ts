// ── Help topic detailed content ───────────────────────────────────────────────
//
// This file contains the full article text shown in the Help detail panel.
// Each key matches a `topic` value in help-items.ts.
//
// To add a new topic: add a key here + a matching entry in help-items.ts.
// To edit content:    update the relevant sections/cta below.
// Currently English-only — add per-language variants here if needed.
// ─────────────────────────────────────────────────────────────────────────────

export interface HelpSection {
  heading: string;
  content?: string;
  list?: string[];
}

export interface HelpCta {
  title: string;
  text: string;
  button: string;
}

export interface HelpTopic {
  title: string;
  sections: HelpSection[];
  cta?: HelpCta;
}

export const helpTopicContent: Record<string, HelpTopic> = {
  integration: {
    title: "Mews x Omniboost Integration",
    sections: [
      { heading: "Overview", content: "The Mews x Omniboost integration connects your Mews PMS to Omniboost's accounting middleware, enabling automated revenue posting, folio exports, and financial reporting." },
      { heading: "How it works", content: "Omniboost fetches data from Mews via the Mews API, transforms it according to your mapping configuration, and pushes it to your connected accounting system. You control what gets pushed and when." },
      { heading: "Integration tiers", content: "Omniboost offers different integration tiers depending on the depth of automation required — from basic revenue push to full accounting sync including payments, taxes, and corrections." },
    ],
  },
  onboarding: {
    title: "Onboarding & Initial Setup",
    sections: [
      { heading: "Step 1: Connect Mews", content: "Go to the Omniboost portal and add your Mews property. You will need your Mews Client Token and Access Token from the Mews Commander settings." },
      { heading: "Step 2: Configure your accounting system", content: "Select your accounting software (e.g. Exact, Xero, QuickBooks) and follow the connection wizard. Omniboost will guide you through authorizing the connection." },
      { heading: "Step 3: Set up your mapping", content: "Map your Mews service categories, payment types, and outlet codes to the corresponding accounts in your accounting system." },
      { heading: "Step 4: Run a test push", content: "Use the manual trigger in the Omniboost portal to run a test push for a specific date. Verify the output in your accounting system before enabling automation." },
    ],
  },
  mapping: {
    title: "Mapping Configuration",
    sections: [
      { heading: "What is mapping?", content: "Mapping defines how each revenue category, payment type, and tax code from Mews gets translated into the correct account or dimension in your accounting system." },
      { heading: "Revenue mapping", content: "Each Mews service (accommodation, F&B, extras) must be mapped to a revenue account. Unmapped items will appear as warnings in the Omniboost portal." },
      { heading: "Payment mapping", content: "Map each Mews payment type (cash, card, city ledger) to the corresponding clearing or liability account in your accounting system." },
      { heading: "Tax mapping", content: "Tax codes from Mews must be matched to the correct VAT or tax rates in your accounting system to ensure compliant reporting." },
    ],
  },
  "revenue-push": {
    title: "Full Revenue Push",
    sections: [
      { heading: "What is Full Revenue Push?", content: "Full Revenue Push is Omniboost's automated daily process that exports the previous day's revenue from Mews and posts it to your accounting system as journal entries." },
      { heading: "Schedule", content: "By default the push runs automatically every morning. You can configure the timing and also trigger it manually from the Omniboost portal for any date range." },
      { heading: "What gets pushed", content: "Revenue by service category, VAT breakdown, payment totals, and corrections/rebates — all mapped to your chart of accounts." },
      { heading: "Troubleshooting push failures", content: "If a push fails, check the Omniboost job log for the error detail. Common causes are unmapped categories, expired API tokens, or locked accounting periods." },
    ],
  },
  troubleshooting: {
    title: "Troubleshooting",
    sections: [
      { heading: "Unmapped items", content: "If the portal shows unmapped warnings, go to your mapping configuration and assign the flagged categories or payment types to the correct accounts before re-running the push." },
      { heading: "API token expired", content: "If Mews returns an authentication error, regenerate your Access Token in Mews Commander and update it in the Omniboost portal under your property settings." },
      { heading: "Data mismatch", content: "If figures in your accounting system don't match Mews, check the date range, timezone settings, and whether any corrections or rebates were applied after the initial push." },
      { heading: "Push not running", content: "Verify that automation is enabled for your property in the Omniboost portal and that your subscription is active." },
    ],
  },
  contact: {
    title: "Contact Support",
    sections: [
      { heading: "Mews integration support", content: "For questions about the Mews x Omniboost integration, reach out to the Omniboost support team via the portal or by email." },
      { heading: "Email", content: "pms@omniboost.be — for integration and technical questions." },
      { heading: "Business hours", content: "Monday – Friday: 9:00 AM – 6:00 PM CET. Urgent issues are handled with priority." },
    ],
    cta: { title: "Chat with Mewsie", text: "For quick answers, just ask Mewsie directly — it has access to the full Omniboost documentation.", button: "Ask Mewsie" },
  },
};
