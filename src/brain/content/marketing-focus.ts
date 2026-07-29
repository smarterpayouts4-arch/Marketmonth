/**
 * User-confirmed marketing focus — guides generation; not website evidence.
 */

export const MARKETING_FOCUS_VALUES = [
  "brand_awareness",
  "value_proposition",
  "product_education",
  "decision_support",
  "trust_authority",
] as const;

export type MarketingFocus = (typeof MARKETING_FOCUS_VALUES)[number];

export const MARKETING_FOCUS_LABELS: Record<MarketingFocus, string> = {
  brand_awareness: "Brand awareness",
  value_proposition: "Value proposition",
  product_education: "Product education",
  decision_support: "Customer decision support",
  trust_authority: "Trust and authority",
};

export const MARKETING_FOCUS_HINTS: Record<MarketingFocus, string> = {
  brand_awareness:
    "Help more people understand who the brand is and why it exists.",
  value_proposition:
    "Explain why the offer is useful, different, or worth considering.",
  product_education:
    "Educate buyers about the products or categories they research — not platform feature tutorials.",
  decision_support:
    "Answer questions, reduce uncertainty, and help people choose.",
  trust_authority:
    "Demonstrate expertise, transparency, proof, or credibility.",
};

/** Default chip set for the dashboard (compact). */
export const DEFAULT_MARKETING_FOCUS_OPTIONS: MarketingFocus[] = [
  "brand_awareness",
  "value_proposition",
  "product_education",
  "decision_support",
];

export function parseMarketingFocus(
  raw: unknown
): { ok: true; value: MarketingFocus | undefined } | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "marketingFocus must be a string" };
  }
  if ((MARKETING_FOCUS_VALUES as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as MarketingFocus };
  }
  return {
    ok: false,
    error: `marketingFocus must be one of: ${MARKETING_FOCUS_VALUES.join(", ")}`,
  };
}

export function marketingFocusPurposeLine(focus: MarketingFocus): string {
  return MARKETING_FOCUS_HINTS[focus];
}
