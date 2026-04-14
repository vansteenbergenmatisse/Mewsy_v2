/**
 * Suite 10: Tier awareness
 * Tests tier signal parsing, doc content filtering, scraper marker injection,
 * session tier field, and user message tier detection.
 * No network calls — all in-memory / pure function tests.
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');

interface TestResult {
  ok: boolean | 'skip';
}

interface Reporter {
  pass: (label: string) => void;
  fail: (label: string, err: string) => void;
  skip: (label: string, reason: string) => void;
  results: TestResult[];
}

export async function checkTier({ pass, fail, skip: _skip, results }: Reporter): Promise<void> {

  // ── stripTierContent ─────────────────────────────────────────────────────
  const { stripTierContent, detectTier } = await import(`${ROOT}/backend/pipeline/agent.ts`);

  const testDoc = [
    'General content visible to all tiers.',
    '',
    '<!-- tier:silver+ -->',
    'Silver feature: credit card fee splitting details.',
    '<!-- /tier -->',
    '',
    '<!-- tier:gold -->',
    'Gold feature: statistics entries and market segmentation.',
    '<!-- /tier -->',
    '',
    'More general content.',
  ].join('\n');

  // Bronze user: Silver+ and Gold blocks replaced with upgrade notes
  const bronzeResult = stripTierContent(testDoc, 'bronze');
  if (!bronzeResult.includes('credit card fee splitting')) {
    pass('stripTierContent: Bronze user — Silver+ content stripped');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Bronze user — Silver+ content stripped', 'Silver content still present');
    results.push({ ok: false });
  }

  if (!bronzeResult.includes('statistics entries')) {
    pass('stripTierContent: Bronze user — Gold content stripped');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Bronze user — Gold content stripped', 'Gold content still present');
    results.push({ ok: false });
  }

  if (bronzeResult.includes('requires Silver tier or higher')) {
    pass('stripTierContent: Bronze user — Silver upgrade note injected');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Bronze user — Silver upgrade note injected', `Got: ${bronzeResult}`);
    results.push({ ok: false });
  }

  if (bronzeResult.includes('requires Gold tier or higher')) {
    pass('stripTierContent: Bronze user — Gold upgrade note injected');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Bronze user — Gold upgrade note injected', `Got: ${bronzeResult}`);
    results.push({ ok: false });
  }

  if (bronzeResult.includes('General content visible to all tiers.') && bronzeResult.includes('More general content.')) {
    pass('stripTierContent: Bronze user — unmarked content preserved');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Bronze user — unmarked content preserved', `Got: ${bronzeResult}`);
    results.push({ ok: false });
  }

  // Silver user: keeps Silver+ blocks, Gold blocks replaced
  const silverResult = stripTierContent(testDoc, 'silver');
  if (silverResult.includes('credit card fee splitting')) {
    pass('stripTierContent: Silver user — Silver+ content kept');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Silver user — Silver+ content kept', 'Silver content was stripped');
    results.push({ ok: false });
  }

  if (!silverResult.includes('statistics entries')) {
    pass('stripTierContent: Silver user — Gold content stripped');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Silver user — Gold content stripped', 'Gold content still present');
    results.push({ ok: false });
  }

  // Gold user: keeps everything
  const goldResult = stripTierContent(testDoc, 'gold');
  if (goldResult.includes('credit card fee splitting') && goldResult.includes('statistics entries')) {
    pass('stripTierContent: Gold user — all content kept');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: Gold user — all content kept', `Got: ${goldResult}`);
    results.push({ ok: false });
  }

  // Null tier (unknown): keeps everything unfiltered
  const nullResult = stripTierContent(testDoc, null);
  if (nullResult === testDoc) {
    pass('stripTierContent: null tier — content unchanged');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: null tier — content unchanged', 'Content was modified');
    results.push({ ok: false });
  }

  // No markers: content unchanged
  const plainDoc = 'Just plain content with no tier markers.';
  if (stripTierContent(plainDoc, 'bronze') === plainDoc) {
    pass('stripTierContent: no markers — content unchanged for any tier');
    results.push({ ok: true });
  } else {
    fail('stripTierContent: no markers — content unchanged for any tier', 'Content was modified');
    results.push({ ok: false });
  }

  // ── detectTier ───────────────────────────────────────────────────────────
  if (detectTier("I'm on the free tier") === 'bronze') {
    pass('detectTier: "free tier" → bronze');
    results.push({ ok: true });
  } else {
    fail('detectTier: "free tier" → bronze', `Got: ${detectTier("I'm on the free tier")}`);
    results.push({ ok: false });
  }

  if (detectTier('We have a free subscription') === 'bronze') {
    pass('detectTier: "free subscription" → bronze');
    results.push({ ok: true });
  } else {
    fail('detectTier: "free subscription" → bronze', `Got: ${detectTier('We have a free subscription')}`);
    results.push({ ok: false });
  }

  if (detectTier('our property is on silver') === 'silver') {
    pass('detectTier: "silver" → silver');
    results.push({ ok: true });
  } else {
    fail('detectTier: "silver" → silver', `Got: ${detectTier('our property is on silver')}`);
    results.push({ ok: false });
  }

  if (detectTier('we have gold') === 'gold') {
    pass('detectTier: "gold" → gold');
    results.push({ ok: true });
  } else {
    fail('detectTier: "gold" → gold', `Got: ${detectTier('we have gold')}`);
    results.push({ ok: false });
  }

  if (detectTier('how do I set up GL mapping?') === null) {
    pass('detectTier: unrelated message → null');
    results.push({ ok: true });
  } else {
    fail('detectTier: unrelated message → null', `Got: ${detectTier('how do I set up GL mapping?')}`);
    results.push({ ok: false });
  }

  // ── injectTierMarkers (scraper) ──────────────────────────────────────────
  const { injectTierMarkers } = await import(`${ROOT}/backend/scraper/pipeline/cleanup.ts`);

  // Silver+ feature detection
  const silverFeatureDoc = 'This section covers credit card fee splitting in detail.';
  const silverInjected = injectTierMarkers(silverFeatureDoc);
  if (silverInjected.includes('<!-- tier:silver+ -->') && silverInjected.includes('<!-- /tier -->')) {
    pass('injectTierMarkers: "credit card fee splitting" → silver+ marker');
    results.push({ ok: true });
  } else {
    fail('injectTierMarkers: "credit card fee splitting" → silver+ marker', `Got: ${silverInjected}`);
    results.push({ ok: false });
  }

  // Gold feature detection
  const goldFeatureDoc = 'Configure statistics entries for your property.';
  const goldInjected = injectTierMarkers(goldFeatureDoc);
  if (goldInjected.includes('<!-- tier:gold -->') && goldInjected.includes('<!-- /tier -->')) {
    pass('injectTierMarkers: "statistics entries" → gold marker');
    results.push({ ok: true });
  } else {
    fail('injectTierMarkers: "statistics entries" → gold marker', `Got: ${goldInjected}`);
    results.push({ ok: false });
  }

  // Comparative paragraph (2+ tier names) — should NOT be marked
  const comparativeDoc = 'Bronze includes basic data, Silver adds detailed entries, Gold adds statistics.';
  const comparativeResult = injectTierMarkers(comparativeDoc);
  if (!comparativeResult.includes('<!-- tier:')) {
    pass('injectTierMarkers: comparative paragraph (2+ tiers) — no markers');
    results.push({ ok: true });
  } else {
    fail('injectTierMarkers: comparative paragraph (2+ tiers) — no markers', `Got: ${comparativeResult}`);
    results.push({ ok: false });
  }

  // Pricing paragraph — should NOT be marked
  const pricingDoc = 'Silver tier costs €1,600 annually per property.';
  const pricingResult = injectTierMarkers(pricingDoc);
  if (!pricingResult.includes('<!-- tier:')) {
    pass('injectTierMarkers: pricing paragraph — no markers');
    results.push({ ok: true });
  } else {
    fail('injectTierMarkers: pricing paragraph — no markers', `Got: ${pricingResult}`);
    results.push({ ok: false });
  }

  // Already-marked content — should NOT double-wrap
  const alreadyMarked = '<!-- tier:gold -->\nStatistics entries setup.\n<!-- /tier -->';
  const doubleResult = injectTierMarkers(alreadyMarked);
  // Count occurrences of <!-- tier: — should be exactly 1
  const markerCount = (doubleResult.match(/<!-- tier:/g) || []).length;
  if (markerCount === 1) {
    pass('injectTierMarkers: already-marked content — no double-wrapping');
    results.push({ ok: true });
  } else {
    fail('injectTierMarkers: already-marked content — no double-wrapping', `Found ${markerCount} markers`);
    results.push({ ok: false });
  }

  // Plain content (no tier features) — should be unchanged
  const plainContent = 'How to configure GL mapping in Mews.';
  if (injectTierMarkers(plainContent) === plainContent) {
    pass('injectTierMarkers: no tier features — content unchanged');
    results.push({ ok: true });
  } else {
    fail('injectTierMarkers: no tier features — content unchanged', 'Content was modified');
    results.push({ ok: false });
  }

  // ── Session tier field ───────────────────────────────────────────────────
  const { getSession, updateContext } = await import(`${ROOT}/backend/pipeline/session.ts`);

  const tierId = `test-tier-${Date.now()}`;
  const tierSession = getSession(tierId);

  if (tierSession.context.tier === null) {
    pass('session: new session has tier: null');
    results.push({ ok: true });
  } else {
    fail('session: new session has tier: null', `Got: ${tierSession.context.tier}`);
    results.push({ ok: false });
  }

  updateContext(tierId, { tier: 'silver' });
  const updatedCtx = getSession(tierId).context;
  if (updatedCtx.tier === 'silver') {
    pass('session: updateContext sets tier correctly');
    results.push({ ok: true });
  } else {
    fail('session: updateContext sets tier correctly', `Got: ${updatedCtx.tier}`);
    results.push({ ok: false });
  }

  // Partial update should not wipe tier
  updateContext(tierId, { setupType: 'Consumed' });
  const afterPartial = getSession(tierId).context;
  if (afterPartial.tier === 'silver' && afterPartial.setupType === 'Consumed') {
    pass('session: partial update does not wipe tier');
    results.push({ ok: true });
  } else {
    fail('session: partial update does not wipe tier', `tier=${afterPartial.tier}, setupType=${afterPartial.setupType}`);
    results.push({ ok: false });
  }
}
