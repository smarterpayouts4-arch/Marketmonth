import type { BrandProfile } from "./brand-profile";
import type { BrandSignals } from "./types";

const MAX_OFFERS = 8;
const MAX_LEN = 90;

/** Reject JSON-LD crumbs, URLs, and non-offer noise. */
export function isJunkOfferFragment(raw: string): boolean {
  const line = raw.replace(/\s+/g, " ").trim();
  if (!line) return true;
  if (/[{}\[\]]/.test(line)) return true;
  if (/@context|schema\.org|application\/ld|\bld\+json\b/i.test(line)) {
    return true;
  }
  if (/^https?:\/\//i.test(line) || /^www\./i.test(line)) return true;
  if (/^["']/.test(line) && /["']$/.test(line) && line.includes(":")) return true;
  if (/^["']?@\w+/.test(line)) return true;
  return false;
}

function cleanOffer(raw: string): string | null {
  const line = raw.replace(/\s+/g, " ").trim();
  if (line.length < 3 || line.length > MAX_LEN) return null;
  if (isJunkOfferFragment(line)) return null;
  if (/^(home|about|contact|blog|faq|menu|login|sign up)$/i.test(line)) {
    return null;
  }
  return line;
}

/**
 * Real offer candidates from crawl signals + profile products/services.
 * Profile offerings are preferred; productText fragments are secondary and filtered.
 */
export function collectOfferHints(
  signals: BrandSignals,
  profile?: Pick<BrandProfile, "products" | "services">
): string[] {
  const fromProfile = [
    ...(profile?.services ?? []),
    ...(profile?.products ?? []),
  ];
  const fromHeadings = signals.headings.filter(
    (h) => h.length > 2 && h.length < 80 && !isJunkOfferFragment(h)
  );
  const fromProducts = signals.productText
    .split(/[\n|•·]+/)
    .flatMap((chunk) => chunk.split(/(?<=[.!?])\s+/))
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 8 && s.length < 90 && !isJunkOfferFragment(s));
  const fromCtas = signals.ctaTexts
    .map((t) => t.replace(/^(get|try|start|book|join|explore)\s+/i, "").trim())
    .filter((t) => t.length > 3 && !isJunkOfferFragment(t));

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const raw of [
    ...fromProfile,
    ...fromHeadings,
    ...fromProducts,
    ...fromCtas,
  ]) {
    const line = cleanOffer(raw);
    if (!line) continue;
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(line);
    if (merged.length >= MAX_OFFERS) break;
  }
  return merged;
}
