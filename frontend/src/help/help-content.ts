// ── Help topic detailed content ───────────────────────────────────────────────
//
// Each topic is loaded from a markdown file in knowledge/help-resources/.
// Source of truth: edit the .md files, not this file.
//
// The ?raw suffix is a Vite feature: it imports the file contents as a string
// at build time so the text is bundled into the app.
//
// Translations live in knowledge/help-resources/<lang>/*.md. The canonical
// English files stay at the root. Regional variants (de-ch, de-at) fall back
// to the base language (de) via getHelpTopicContent().
// ─────────────────────────────────────────────────────────────────────────────

import { parseMd } from './parse-md';

// ── English (canonical, root) ────────────────────────────────────────────────
import omniboostEn         from '../../../knowledge/help-resources/omniboost.md?raw';
import mewsEn              from '../../../knowledge/help-resources/mews.md?raw';
import integrationEn       from '../../../knowledge/help-resources/integration.md?raw';
import onboardingEn        from '../../../knowledge/help-resources/onboarding.md?raw';
import tiersEn             from '../../../knowledge/help-resources/tiers.md?raw';
import accountingFlowsEn   from '../../../knowledge/help-resources/accounting-flows.md?raw';
import mappingEn           from '../../../knowledge/help-resources/mapping.md?raw';
import fallbackEn          from '../../../knowledge/help-resources/fallback.md?raw';
import suspenseEn          from '../../../knowledge/help-resources/suspense.md?raw';
import vatEn               from '../../../knowledge/help-resources/vat.md?raw';
import ledgersEn           from '../../../knowledge/help-resources/ledgers.md?raw';
import gatewayCommissionEn from '../../../knowledge/help-resources/gateway-commission.md?raw';
import troubleshootingEn   from '../../../knowledge/help-resources/troubleshooting.md?raw';

// ── German ───────────────────────────────────────────────────────────────────
import omniboostDe         from '../../../knowledge/help-resources/de/omniboost.md?raw';
import mewsDe              from '../../../knowledge/help-resources/de/mews.md?raw';
import integrationDe       from '../../../knowledge/help-resources/de/integration.md?raw';
import onboardingDe        from '../../../knowledge/help-resources/de/onboarding.md?raw';
import tiersDe             from '../../../knowledge/help-resources/de/tiers.md?raw';
import accountingFlowsDe   from '../../../knowledge/help-resources/de/accounting-flows.md?raw';
import mappingDe           from '../../../knowledge/help-resources/de/mapping.md?raw';
import fallbackDe          from '../../../knowledge/help-resources/de/fallback.md?raw';
import suspenseDe          from '../../../knowledge/help-resources/de/suspense.md?raw';
import vatDe               from '../../../knowledge/help-resources/de/vat.md?raw';
import ledgersDe           from '../../../knowledge/help-resources/de/ledgers.md?raw';
import gatewayCommissionDe from '../../../knowledge/help-resources/de/gateway-commission.md?raw';
import troubleshootingDe   from '../../../knowledge/help-resources/de/troubleshooting.md?raw';

// ── French ───────────────────────────────────────────────────────────────────
import omniboostFr         from '../../../knowledge/help-resources/fr/omniboost.md?raw';
import mewsFr              from '../../../knowledge/help-resources/fr/mews.md?raw';
import integrationFr       from '../../../knowledge/help-resources/fr/integration.md?raw';
import onboardingFr        from '../../../knowledge/help-resources/fr/onboarding.md?raw';
import tiersFr             from '../../../knowledge/help-resources/fr/tiers.md?raw';
import accountingFlowsFr   from '../../../knowledge/help-resources/fr/accounting-flows.md?raw';
import mappingFr           from '../../../knowledge/help-resources/fr/mapping.md?raw';
import fallbackFr          from '../../../knowledge/help-resources/fr/fallback.md?raw';
import suspenseFr          from '../../../knowledge/help-resources/fr/suspense.md?raw';
import vatFr               from '../../../knowledge/help-resources/fr/vat.md?raw';
import ledgersFr           from '../../../knowledge/help-resources/fr/ledgers.md?raw';
import gatewayCommissionFr from '../../../knowledge/help-resources/fr/gateway-commission.md?raw';
import troubleshootingFr   from '../../../knowledge/help-resources/fr/troubleshooting.md?raw';

// ── Dutch ────────────────────────────────────────────────────────────────────
import omniboostNl         from '../../../knowledge/help-resources/nl/omniboost.md?raw';
import mewsNl              from '../../../knowledge/help-resources/nl/mews.md?raw';
import integrationNl       from '../../../knowledge/help-resources/nl/integration.md?raw';
import onboardingNl        from '../../../knowledge/help-resources/nl/onboarding.md?raw';
import tiersNl             from '../../../knowledge/help-resources/nl/tiers.md?raw';
import accountingFlowsNl   from '../../../knowledge/help-resources/nl/accounting-flows.md?raw';
import mappingNl           from '../../../knowledge/help-resources/nl/mapping.md?raw';
import fallbackNl          from '../../../knowledge/help-resources/nl/fallback.md?raw';
import suspenseNl          from '../../../knowledge/help-resources/nl/suspense.md?raw';
import vatNl               from '../../../knowledge/help-resources/nl/vat.md?raw';
import ledgersNl           from '../../../knowledge/help-resources/nl/ledgers.md?raw';
import gatewayCommissionNl from '../../../knowledge/help-resources/nl/gateway-commission.md?raw';
import troubleshootingNl   from '../../../knowledge/help-resources/nl/troubleshooting.md?raw';

// Re-export types so HelpDetailPanel and the index can use them
export interface HelpSection {
  heading: string;
  content?: string;
  list?: string[];
}

export interface HelpCta {
  title: string;
  text: string;
  button: string;
  message: string;
}

export interface HelpTopic {
  title: string;
  sections: HelpSection[];
  cta?: HelpCta;
}

// Nested map: language code → topic id → parsed HelpTopic.
const helpTopicContentByLang: Record<string, Record<string, HelpTopic>> = {
  en: {
    omniboost:            parseMd(omniboostEn),
    mews:                 parseMd(mewsEn),
    integration:          parseMd(integrationEn),
    onboarding:           parseMd(onboardingEn),
    tiers:                parseMd(tiersEn),
    'accounting-flows':   parseMd(accountingFlowsEn),
    mapping:              parseMd(mappingEn),
    fallback:             parseMd(fallbackEn),
    suspense:             parseMd(suspenseEn),
    vat:                  parseMd(vatEn),
    ledgers:              parseMd(ledgersEn),
    'gateway-commission': parseMd(gatewayCommissionEn),
    troubleshooting:      parseMd(troubleshootingEn),
  },
  de: {
    omniboost:            parseMd(omniboostDe),
    mews:                 parseMd(mewsDe),
    integration:          parseMd(integrationDe),
    onboarding:           parseMd(onboardingDe),
    tiers:                parseMd(tiersDe),
    'accounting-flows':   parseMd(accountingFlowsDe),
    mapping:              parseMd(mappingDe),
    fallback:             parseMd(fallbackDe),
    suspense:             parseMd(suspenseDe),
    vat:                  parseMd(vatDe),
    ledgers:              parseMd(ledgersDe),
    'gateway-commission': parseMd(gatewayCommissionDe),
    troubleshooting:      parseMd(troubleshootingDe),
  },
  fr: {
    omniboost:            parseMd(omniboostFr),
    mews:                 parseMd(mewsFr),
    integration:          parseMd(integrationFr),
    onboarding:           parseMd(onboardingFr),
    tiers:                parseMd(tiersFr),
    'accounting-flows':   parseMd(accountingFlowsFr),
    mapping:              parseMd(mappingFr),
    fallback:             parseMd(fallbackFr),
    suspense:             parseMd(suspenseFr),
    vat:                  parseMd(vatFr),
    ledgers:              parseMd(ledgersFr),
    'gateway-commission': parseMd(gatewayCommissionFr),
    troubleshooting:      parseMd(troubleshootingFr),
  },
  nl: {
    omniboost:            parseMd(omniboostNl),
    mews:                 parseMd(mewsNl),
    integration:          parseMd(integrationNl),
    onboarding:           parseMd(onboardingNl),
    tiers:                parseMd(tiersNl),
    'accounting-flows':   parseMd(accountingFlowsNl),
    mapping:              parseMd(mappingNl),
    fallback:             parseMd(fallbackNl),
    suspense:             parseMd(suspenseNl),
    vat:                  parseMd(vatNl),
    ledgers:              parseMd(ledgersNl),
    'gateway-commission': parseMd(gatewayCommissionNl),
    troubleshooting:      parseMd(troubleshootingNl),
  },
};

// Fallback chain mirroring uiStr(): exact lang → base lang → en.
// Inner fallback to en also guards against a topic missing from a language map.
export function getHelpTopicContent(topic: string, lang: string | null): HelpTopic | null {
  const l = lang || 'en';
  const base = l.split('-')[0];
  const map = helpTopicContentByLang[l] ?? helpTopicContentByLang[base] ?? helpTopicContentByLang['en'];
  return map[topic] ?? helpTopicContentByLang['en'][topic] ?? null;
}

// Preserved legacy export — used by tests that don't pass a language.
// Always returns the English map.
export const helpTopicContent = helpTopicContentByLang['en'];
