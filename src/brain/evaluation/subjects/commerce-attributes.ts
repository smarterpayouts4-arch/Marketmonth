/**
 * Typed commerce attributes (P2.3) — industry-agnostic attribute families
 * detected in *typed* CSV fields (commercialTerms, indexedProducts.price).
 * These are commerce concepts, not industry vocabulary: any company that
 * publishes shipping/returns/pricing terms gets grounded comparison attrs.
 */

export const COMMERCE_ATTRIBUTES: ReadonlyArray<{
  attr: string;
  re: RegExp;
}> = [
  { attr: "price", re: /\bpric(?:e|es|ing)\b|\bcosts?\b|\brates?\b/i },
  { attr: "shipping", re: /\b(?:shipping|delivery|deliver(?:ed|s)?|dispatch)\b/i },
  { attr: "returns", re: /\b(?:returns?|refunds?|money[- ]back)\b/i },
  { attr: "warranty", re: /\b(?:warrant(?:y|ies)|guarantees?d?)\b/i },
  { attr: "subscription", re: /\b(?:subscriptions?|subscribe|auto[- ]?ship)\b/i },
];

/** First commerce attribute family present in the text, if any. */
export function typedCommerceAttribute(text: string): string | undefined {
  for (const { attr, re } of COMMERCE_ATTRIBUTES) {
    if (re.test(text)) return attr;
  }
  return undefined;
}
