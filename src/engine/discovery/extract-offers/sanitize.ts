/** Text hygiene for offer candidates: reject crumbs, normalize, dedupe. */

export const MAX_OFFERS = 8;
export const MAX_LEN = 90;

/** Offer candidate with optional page-level source URL. */
export type OfferHint = {
  label: string;
  /** Page where the offer was observed; omit when unknown. */
  sourceUrl?: string;
};

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

export function cleanOffer(raw: string): string | null {
  const line = raw.replace(/\s+/g, " ").trim();
  if (line.length < 3 || line.length > MAX_LEN) return null;
  if (isJunkOfferFragment(line)) return null;
  if (/^(home|about|contact|blog|faq|menu|login|sign up)$/i.test(line)) {
    return null;
  }
  return line;
}

export function pushOffer(
  merged: OfferHint[],
  seen: Set<string>,
  raw: string,
  sourceUrl?: string
): void {
  const line = cleanOffer(raw);
  if (!line) return;
  const key = line.toLowerCase();
  if (seen.has(key)) return;
  seen.add(key);
  merged.push(sourceUrl ? { label: line, sourceUrl } : { label: line });
}
