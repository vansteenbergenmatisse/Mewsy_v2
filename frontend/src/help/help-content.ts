// ── Help topic detailed content ───────────────────────────────────────────────
//
// Each topic is loaded from a markdown file in knowledge/help-resources/.
// Source of truth: edit the .md files, not this file.
//
// The ?raw suffix is a Vite feature: it imports the file contents as a string
// at build time so the text is bundled into the app.
// ─────────────────────────────────────────────────────────────────────────────

import { parseMd } from './parse-md';

import omniboostMd        from '../../../knowledge/help-resources/omniboost.md?raw';
import mewsMd             from '../../../knowledge/help-resources/mews.md?raw';
import integrationMd      from '../../../knowledge/help-resources/integration.md?raw';
import onboardingMd       from '../../../knowledge/help-resources/onboarding.md?raw';
import tiersMd            from '../../../knowledge/help-resources/tiers.md?raw';
import accountingFlowsMd  from '../../../knowledge/help-resources/accounting-flows.md?raw';
import mappingMd          from '../../../knowledge/help-resources/mapping.md?raw';
import fallbackMd         from '../../../knowledge/help-resources/fallback.md?raw';
import suspenseMd         from '../../../knowledge/help-resources/suspense.md?raw';
import vatMd              from '../../../knowledge/help-resources/vat.md?raw';
import ledgersMd          from '../../../knowledge/help-resources/ledgers.md?raw';
import gatewayCommissionMd from '../../../knowledge/help-resources/gateway-commission.md?raw';
import troubleshootingMd  from '../../../knowledge/help-resources/troubleshooting.md?raw';

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

export const helpTopicContent: Record<string, HelpTopic> = {
  omniboost:          parseMd(omniboostMd),
  mews:               parseMd(mewsMd),
  integration:        parseMd(integrationMd),
  onboarding:         parseMd(onboardingMd),
  tiers:              parseMd(tiersMd),
  'accounting-flows': parseMd(accountingFlowsMd),
  mapping:            parseMd(mappingMd),
  fallback:           parseMd(fallbackMd),
  suspense:           parseMd(suspenseMd),
  vat:                parseMd(vatMd),
  ledgers:            parseMd(ledgersMd),
  'gateway-commission': parseMd(gatewayCommissionMd),
  troubleshooting:    parseMd(troubleshootingMd),
};
