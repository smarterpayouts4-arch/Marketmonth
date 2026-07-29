import type { BrandProfile } from "./brand-profile";
import type { BrandSignals } from "./types";

const MAX_OFFERS = 8;
const MAX_LEN = 90;

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

function cleanOffer(raw: string): string | null {
  const line = raw.replace(/\s+/g, " ").trim();
  if (line.length < 3 || line.length > MAX_LEN) return null;
  if (isJunkOfferFragment(line)) return null;
  if (/^(home|about|contact|blog|faq|menu|login|sign up)$/i.test(line)) {
    return null;
  }
  return line;
}

function pushOffer(
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

/**
 * Nouns that name a transaction step. They are what makes a speed or zero-cost
 * claim commercial: "same-day delivery" is an offer, "Same Day Surgery Center"
 * is a department, and "free consultation" is an offer where "Free Range" is a
 * farming method.
 */
const TRANSACTION_NOUN = [
  "quote",
  "estimate",
  "consultation",
  "consult",
  "trial",
  "sample",
  "shipping",
  "delivery",
  "returns?",
  "exchanges?",
  "refunds?",
  "installation",
  "setup",
  "demo",
  "assessment",
  "inspection",
  "appointments?",
  "bookings?",
  "case\\s+(?:review|evaluation)",
  "evaluation",
  "cancellation",
  "pickup",
].join("|");

/**
 * Commercial mechanics — how a buyer transacts, not what is being sold.
 *
 * Tuned for PRECISION over recall against scripts/tmp-offer-precision.ts: a
 * false offer is restated as a factual claim in generated copy, while a missed
 * one costs a single content angle. An empty offer list is a valid result.
 *
 * Deliberately absent, each having produced a measured false positive:
 * bare `free` (Gluten-Free Menu, worry-free plumbing), bare `guarantee`
 * (Saia Guaranteed 10 a.m.), bare `warranty` (Extended Warranty Plan), bare
 * `trial` (trial size), and `pricing` / `price comparison` / `price per
 * serving`, which name a real customer's product rather than any offer.
 */
const COMMERCIAL_PATTERNS: readonly RegExp[] = [
  // Money named outright — the most universal offer marker there is.
  /[$€£¥]\s?\d/,
  /\b\d[\d.,]*\s*(?:USD|EUR|GBP|AUD|CAD|NZD)\b/i,
  /\b(?:starting\s+at|from|as\s+low\s+as)\s+[$€£¥]?\s?\d/i,
  /\b\d+\s+for\s+[$€£¥]?\s?\d/i,

  // Discounting.
  /\b\d+\s*%\s*off\b/i,
  /\bsave\s+(?:\d+\s*%|[$€£¥]\s?\d)/i,
  /\bdiscounts?\b/i,
  /\bcoupons?\b/i,
  /\bpromo(?:\s*codes?|tions?)?\b/i,
  /\bon\s+sale\b/i,
  /\bspecials\b/i,

  // Zero cost, always bound to a transaction noun or a predicate.
  new RegExp(`\\bfree\\s+(?:${TRANSACTION_NOUN})\\b`, "i"),
  /\b(?:is|are|ships?|shipped|arrives?|included)\s+free\b/i,
  /\bfor\s+free\b/i,
  /\bfree\s*[—–]/,
  /\b(?:complimentary|waived|on\s+the\s+house)\b/i,
  /\$0\b/,

  // Absence of a cost, a commitment, or a barrier.
  /\bno\s+(?:cost|fees?|charge|minimums?|obligation|contracts?|commitments?)\b/i,
  /\bno\s+(?:hidden|surprise|extra)\s+\w+/i,
  /\bno\s+(?:sign[-\s]?up|account)\b/i,
  /\bno\s+questions\s+asked\b/i,

  // Risk reversal, always bound to a number, a predicate, or money-back.
  /\bmoney[-\s]back\b/i,
  /\brefunds?\b/i,
  /\bsatisfaction\s+guarantee/i,
  /\b\d+[-\s]day\s+(?:guarantee|warranty|returns?|trial|refund)/i,
  /\bwe\s+guarantee\b/i,
  /\bguaranteed\s+(?:or|if)\b/i,
  /\bcancel\s+anytime\b/i,
  /\breturns?\s+(?:policy|window)\b/i,

  // Price modality and payment terms.
  /\bflat[-\s]rate\b/i,
  /\bprice\s+match\b/i,
  /\bfinancing\b/i,
  /\binstallments?\b/i,
  /\bpay\s+later\b/i,
  /\bnet[-\s]?\d+\s+terms\b/i,
  /\bgift\s+(?:cards?|vouchers?|certificates?)\b/i,

  // Access and speed, always bound to a transaction noun.
  new RegExp(`\\b(?:same|next)[-\\s]day\\s+(?:${TRANSACTION_NOUN})\\b`, "i"),
  new RegExp(`\\binstant\\s+(?:${TRANSACTION_NOUN})\\b`, "i"),
  /\bwalk[-\s]ins?\s+welcome\b/i,
  /\b(?:schedule|book)\s+(?:online|now|a\s+\w+)\b/i,
];

/**
 * True when the text describes a commercial mechanic rather than a product.
 *
 * `X-free` compounds are stripped before matching, because the hyphen satisfies
 * a word boundary and would otherwise turn every gluten-free menu and
 * worry-free promise into an offer.
 */
export function isCommercialTerm(raw: string): boolean {
  const line = raw.replace(/\s+/g, " ").trim();
  if (!line) return false;
  const deCompounded = line.replace(/\w+-free\b/gi, " ");
  return COMMERCIAL_PATTERNS.some((re) => re.test(deCompounded));
}

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

/** True when sourceUrl points at a specific page (not only site root). */
export function isPageLevelSourceUrl(
  sourceUrl: string | undefined,
  website?: string
): boolean {
  if (!sourceUrl?.trim()) return false;
  try {
    const u = new URL(sourceUrl);
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "") return false;
    if (website) {
      const home = new URL(
        /^https?:\/\//i.test(website) ? website : `https://${website}`
      );
      if (
        u.origin === home.origin &&
        (path === "" || path === "/" || path === home.pathname.replace(/\/+$/, ""))
      ) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
