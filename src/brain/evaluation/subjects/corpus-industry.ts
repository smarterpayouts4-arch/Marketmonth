import type { ContentBrainContext } from "@/brain/content/types";

/**
 * Supplement / vitamin / retail shopping vocabulary.
 * Used only to *enable* industry-shaped heuristics when the company's own
 * Brand Core corpus already uses that language — never to inject it.
 */
export const SUPPLEMENT_RETAIL_CORPUS_RE =
  /\b(supplement|supplements|vitamin|vitamins|magnesium|glycinate|softgel|gummies|bioavailab|nutrient|dosage|capsule|methylcobalamin|cyanocobalamin|ashwagandha|creatine|omega-?3|probiotic|price\s+per\s+serving|serving\s+size)\b/i;

/** Retail shopping shell cues that must not frame non-retail brands. */
export const RETAIL_SHOPPING_SHELL_RE =
  /\b(label check|check the label|before you buy|the longer you shop|serving size|comparison trap before you buy|price per serving)\b/i;

/**
 * True when Brand Core narrative/catalog already speaks supplement/retail.
 * Gate ingredient, category, and retail-shell heuristics on this signal.
 */
export function corpusSupportsSupplementRetailHeuristics(
  context: ContentBrainContext
): boolean {
  const blob = [
    context.brandName,
    context.description,
    context.audience,
    context.valueProposition,
    context.brandVoice,
    context.marketingOpportunity,
    ...(context.products ?? []),
    ...(context.services ?? []),
    ...(context.contentOpportunities ?? []),
    ...(context.indexedProducts ?? []).map((p) => p.name),
    ...(context.commercialTerms ?? []).map((t) => t.label),
  ]
    .filter(Boolean)
    .join(" ");
  return SUPPLEMENT_RETAIL_CORPUS_RE.test(blob);
}
