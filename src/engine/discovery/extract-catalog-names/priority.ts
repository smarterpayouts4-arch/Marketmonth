/**
 * Catalog ranking: domain keyword lists are boosts only when the site’s own
 * content already contains that family of terms — never a hard filter.
 */

/** Supplement-family boost order (used only when the crawl already looks like that category). */
export const SUPPLEMENT_BOOST_RE: RegExp[] = [
  /^magnesium glycinate$/i,
  /^vitamin d3$/i,
  /^magnesium$/i,
  /^vitamin c$/i,
  /^vitamin d$/i,
  /^vitamin b12$/i,
  /^zinc$/i,
  /^omega-3$/i,
  /^calcium$/i,
  /^creatine$/i,
];

/** @deprecated Prefer SUPPLEMENT_BOOST_RE — kept for import compatibility. */
export const CATALOG_PRIORITY_RE = SUPPLEMENT_BOOST_RE;

const SUPPLEMENT_SITE_RE =
  /\b(vitamin|vitamins|mineral|minerals|magnesium|omega-?3|supplement|supplements|glycinate|softgel)\b/i;

/** Detect whether the crawl already uses supplement-shaped vocabulary. */
export function siteSupportsSupplementBoost(corpusText: string): boolean {
  return SUPPLEMENT_SITE_RE.test(corpusText);
}

export function boostPatternsForCorpus(corpusText: string): RegExp[] {
  return siteSupportsSupplementBoost(corpusText) ? SUPPLEMENT_BOOST_RE : [];
}

/**
 * Lower score = higher rank. Boost patterns only reorder when enabled for the site;
 * unknown names still compete via length (never dropped here).
 */
export function catalogPriority(
  name: string,
  boostPatterns: RegExp[] = SUPPLEMENT_BOOST_RE
): number {
  const idx = boostPatterns.findIndex((re) => re.test(name));
  if (idx !== -1) return idx;
  return 100 + Math.min(name.trim().length, 60);
}
