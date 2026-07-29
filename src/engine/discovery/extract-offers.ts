/**
 * Offer extraction — thin orchestrator.
 *
 * Logic lives in ./extract-offers/: text hygiene in sanitize, the
 * commercial-mechanic vocabulary in commercial-patterns, URL scoping in
 * source-url. Public surface is unchanged so call sites import from here.
 */
import type { BrandProfile } from "./brand-profile";
import { isCommercialTerm } from "./extract-offers/commercial-patterns";
import {
  MAX_LEN,
  MAX_OFFERS,
  cleanOffer,
  pushOffer,
  type OfferHint,
} from "./extract-offers/sanitize";
import type { BrandSignals } from "./types";

export type { OfferHint };
export { isCommercialTerm } from "./extract-offers/commercial-patterns";
export { isJunkOfferFragment } from "./extract-offers/sanitize";
export { isPageLevelSourceUrl } from "./extract-offers/source-url";

/**
 * Genuine offer candidates: commercial terms observed on the site.
 *
 * Product and service names are deliberately NOT sources here — they belong in
 * products / services / indexedProducts. `profile.indexedProducts` is used as an
 * exclusion list so a catalog name can never be republished as an offer.
 */
export function collectOfferHints(
  signals: BrandSignals,
  profile?: Pick<BrandProfile, "products" | "services" | "website" | "indexedProducts">
): OfferHint[] {
  const merged: OfferHint[] = [];
  const seen = new Set<string>();

  // Catalog names are products, never offers — enforced structurally.
  const catalogNames = new Set<string>();
  for (const p of profile?.indexedProducts ?? []) {
    catalogNames.add(p.name.trim().toLowerCase());
  }
  for (const p of signals.indexedProducts ?? []) {
    catalogNames.add(p.name.trim().toLowerCase());
  }
  for (const raw of [
    ...(profile?.products ?? []),
    ...(profile?.services ?? []),
  ]) {
    catalogNames.add(raw.trim().toLowerCase());
  }

  const push = (raw: string, sourceUrl?: string): void => {
    if (merged.length >= MAX_OFFERS) return;
    const line = cleanOffer(raw);
    if (!line) return;
    if (catalogNames.has(line.toLowerCase())) return;
    if (!isCommercialTerm(line)) return;
    pushOffer(merged, seen, line, sourceUrl);
  };

  for (const h of signals.headings) {
    if (h.length > 2 && h.length < 80) push(h);
  }

  const productLines = signals.productText
    .split(/[\n|•·]+/)
    .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 8 && s.length < MAX_LEN);
  for (const raw of productLines) push(raw);

  for (const t of signals.ctaTexts) {
    const cleaned = t.replace(/^(get|try|start|book|join|explore)\s+/i, "").trim();
    if (cleaned.length > 3) push(cleaned);
  }

  return merged;
}
