// ── Language configuration ─────────────────────────────────────────────────────

export interface Language {
  code: string;
  flag: string;
  label: string;
  systemName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'en',    flag: '🇺🇸', label: 'English',           systemName: 'English' },
  { code: 'de',    flag: '🇩🇪', label: 'Deutsch',            systemName: 'German' },
  { code: 'de-ch', flag: '🇨🇭', label: 'Schweizerdeutsch',   systemName: 'Swiss German' },
  { code: 'de-at', flag: '🇦🇹', label: 'Österreichisch',     systemName: 'Austrian German' },
  { code: 'fr',    flag: '🇫🇷', label: 'Français',           systemName: 'French' },
  { code: 'nl',    flag: '🇳🇱', label: 'Nederlands',         systemName: 'Dutch' },
];

// ── Translated UI strings ──────────────────────────────────────────────────────

export const UI_STRINGS: Record<string, Record<string, string>> = {
  somethingElse: { en: 'Something else', de: 'Etwas anderes', 'de-ch': 'Etwas anderes', 'de-at': 'Etwas anderes', fr: 'Autre chose', nl: 'Iets anders' },
  typeOwn:       { en: 'Or type your own answer...', de: 'Oder eigene Antwort eingeben...', 'de-ch': 'Oder eigene Antwort eingeben...', 'de-at': 'Oder eigene Antwort eingeben...', fr: 'Ou tapez votre propre réponse...', nl: 'Of typ uw eigen antwoord...' },
  typeMsg:       { en: 'Type your message...', de: 'Nachricht eingeben...', 'de-ch': 'Nachricht eingeben...', 'de-at': 'Nachricht eingeben...', fr: 'Tapez votre message...', nl: 'Typ uw bericht...' },
  scrollLatest:  { en: 'Latest', de: 'Neueste', 'de-ch': 'Neueste', 'de-at': 'Neueste', fr: 'Dernier', nl: 'Nieuwste' },
};

// Returns the UI string for the given key and language code
export function uiStr(key: string, lang: string | null): string {
  const l = lang || 'en';
  const map = UI_STRINGS[key];
  if (!map) return '';
  return map[l] || map[l.split('-')[0]] || map['en'] || '';
}

// ── Welcome text ───────────────────────────────────────────────────────────────

export const welcomeText: Record<string, string[]> = {
  en: [
    "Hi! I'm Mewsy, the Mews x Omniboost support assistant.",
    "Whether you're onboarding, configuring your mapping, or troubleshooting an issue — I'm here to help. What do you need?"
  ],
  de: [
    "Hallo! Ich bin Mewsy, der Support-Assistent für Mews x Omniboost.",
    "Egal ob Onboarding, Mapping-Konfiguration oder Fehlerbehebung — ich bin für dich da. Was brauchst du?"
  ],
  fr: [
    "Bonjour ! Je suis Mewsy, l'assistant support pour Mews x Omniboost.",
    "Que vous soyez en cours d'intégration, de configuration ou de dépannage, je suis là pour vous aider. De quoi avez-vous besoin ?"
  ],
  nl: [
    "Hoi! Ik ben Mewsy, de support-assistent voor Mews x Omniboost.",
    "Of je nu onboarding doet, je mapping instelt of een probleem oplost — ik ben hier om te helpen. Wat heb je nodig?"
  ],
};

// ── Thinking messages ──────────────────────────────────────────────────────────

export const thinkingMessagesMap: Record<string, string[]> = {
  en:    ["Mewsy is thinking...", "Checking the documentation...", "Almost there...", "Just a moment longer..."],
  de:    ["Mewsy denkt nach...", "Dokumentation wird geprüft...", "Fast fertig...", "Noch einen Moment..."],
  fr:    ["Mewsy réfléchit...", "Consultation de la documentation...", "Presque terminé...", "Encore un instant..."],
  nl:    ["Mewsy denkt na...", "Documentatie raadplegen...", "Bijna klaar...", "Nog even geduld..."],
};

export function getThinkingMessages(lang: string | null): string[] {
  const l = lang || 'en';
  const base = l.split('-')[0];
  return thinkingMessagesMap[l] || thinkingMessagesMap[base] || thinkingMessagesMap['en'];
}

// ── Option button constants ────────────────────────────────────────────────────

// Maximum number of option buttons to display
export const BUTTON_MAX = 7;

// Imperative verbs that indicate a list is a step list, not an option list.
// Items starting with these words must never become buttons.
export const BUTTON_IMPERATIVE_VERBS = /^(select|enter|go|click|open|navigate|complete|accept|connect|verify|choose|pick|set|configure|enable|add|create|map|copy|paste|tap|press|type|fill|save|check|disable|toggle|submit|upload|download|log in|sign in|make sure|ensure|hit|repeat|scroll|drag|drop|remove|delete|update|edit|move|find|look|visit|return|close|confirm|wait|allow|grant|install|restart|refresh|reload)\b/i;

// ── Help topic content ─────────────────────────────────────────────────────────

interface HelpSection {
  heading: string;
  content?: string;
  list?: string[];
}

interface HelpCta {
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
      { heading: "Integration tiers", content: "Omniboost offers different integration tiers depending on the depth of automation required — from basic revenue push to full accounting sync including payments, taxes, and corrections." }
    ]
  },
  onboarding: {
    title: "Onboarding & Initial Setup",
    sections: [
      { heading: "Step 1: Connect Mews", content: "Go to the Omniboost portal and add your Mews property. You will need your Mews Client Token and Access Token from the Mews Commander settings." },
      { heading: "Step 2: Configure your accounting system", content: "Select your accounting software (e.g. Exact, Xero, QuickBooks) and follow the connection wizard. Omniboost will guide you through authorizing the connection." },
      { heading: "Step 3: Set up your mapping", content: "Map your Mews service categories, payment types, and outlet codes to the corresponding accounts in your accounting system." },
      { heading: "Step 4: Run a test push", content: "Use the manual trigger in the Omniboost portal to run a test push for a specific date. Verify the output in your accounting system before enabling automation." }
    ]
  },
  mapping: {
    title: "Mapping Configuration",
    sections: [
      { heading: "What is mapping?", content: "Mapping defines how each revenue category, payment type, and tax code from Mews gets translated into the correct account or dimension in your accounting system." },
      { heading: "Revenue mapping", content: "Each Mews service (accommodation, F&B, extras) must be mapped to a revenue account. Unmapped items will appear as warnings in the Omniboost portal." },
      { heading: "Payment mapping", content: "Map each Mews payment type (cash, card, city ledger) to the corresponding clearing or liability account in your accounting system." },
      { heading: "Tax mapping", content: "Tax codes from Mews must be matched to the correct VAT or tax rates in your accounting system to ensure compliant reporting." }
    ]
  },
  "revenue-push": {
    title: "Full Revenue Push",
    sections: [
      { heading: "What is Full Revenue Push?", content: "Full Revenue Push is Omniboost's automated daily process that exports the previous day's revenue from Mews and posts it to your accounting system as journal entries." },
      { heading: "Schedule", content: "By default the push runs automatically every morning. You can configure the timing and also trigger it manually from the Omniboost portal for any date range." },
      { heading: "What gets pushed", content: "Revenue by service category, VAT breakdown, payment totals, and corrections/rebates — all mapped to your chart of accounts." },
      { heading: "Troubleshooting push failures", content: "If a push fails, check the Omniboost job log for the error detail. Common causes are unmapped categories, expired API tokens, or locked accounting periods." }
    ]
  },
  troubleshooting: {
    title: "Troubleshooting",
    sections: [
      { heading: "Unmapped items", content: "If the portal shows unmapped warnings, go to your mapping configuration and assign the flagged categories or payment types to the correct accounts before re-running the push." },
      { heading: "API token expired", content: "If Mews returns an authentication error, regenerate your Access Token in Mews Commander and update it in the Omniboost portal under your property settings." },
      { heading: "Data mismatch", content: "If figures in your accounting system don't match Mews, check the date range, timezone settings, and whether any corrections or rebates were applied after the initial push." },
      { heading: "Push not running", content: "Verify that automation is enabled for your property in the Omniboost portal and that your subscription is active." }
    ]
  },
  contact: {
    title: "Contact Support",
    sections: [
      { heading: "Mews integration support", content: "For questions about the Mews x Omniboost integration, reach out to the Omniboost support team via the portal or by email." },
      { heading: "Email", content: "pms@omniboost.be — for integration and technical questions." },
      { heading: "Business hours", content: "Monday – Friday: 9:00 AM – 6:00 PM CET. Urgent issues are handled with priority." }
    ],
    cta: { title: "Chat with Mewsy", text: "For quick answers, just ask Mewsy directly — it has access to the full Omniboost documentation.", button: "Ask Mewsy" }
  }
};
