/**
 * Shared ingredient / platform patterns for subject classification
 * and industry-research mapping. One source — no divergent regexes.
 *
 * Callers on the topic/directions path must gate supplement/retail uses
 * behind `corpusSupportsSupplementRetailHeuristics` (see corpus-industry.ts).
 */

export const PLATFORM_CAPABILITY_RE =
  /\b(search|comparison|compare|builder|advisor|filter|filters|console|dashboard|platform|engine|tool|toolkit|sdk|api|app|software|service)\b/i;

export const INGREDIENT_HINT_RE =
  /\b(ingredient|mineral|vitamin|extract|glycinate|citrate|oxide|form|formulation)\b/i;

/** Gerunds / evaluative verbs — never ingredients even before "supplement". */
export const REJECT_AS_INGREDIENT_LABEL_RE =
  /^(Comparing|Choosing|Evaluating|Selecting|Finding|Buying|Using|Making|Getting|Checking|Asking|Understanding|Navigating|Helping|Improving|Optimizing|Building|Creating|Starting|Planning)\b/i;

/**
 * Positive evidence for named ingredients in free text.
 * Unknown capitalized word before "supplement" is NOT enough.
 */
export const POSITIVE_INGREDIENT_TOKEN_RE =
  /\b((?:Vitamin\s+[A-Z]\d?[a-z]*)|(?:Magnesium)|(?:Vitamin\s+C)|(?:Omega-?3)|(?:Zinc)|(?:[A-Z][a-z]{2,}(?:\s+[a-z]+)?)\s+(?:glycinate|citrate|oxide|extract|malate|threonate|picolinate))\b/i;

export const COMPARISON_ATTR_RE =
  /\b(label|labels|price|prices|serving|brand|brands|retailer|retailers|formulation|ingredients?|trade-?off|criteria|checklist|compare|forms?)\b/i;

export const CATEGORY_RE =
  /\b(supplements|supplement|vitamins|vitamin|minerals|mineral|product category)\b/i;

export function looksLikeIngredientLabel(label: string): boolean {
  const t = label.trim();
  if (!t || REJECT_AS_INGREDIENT_LABEL_RE.test(t)) return false;
  if (PLATFORM_CAPABILITY_RE.test(t)) return false;
  if (POSITIVE_INGREDIENT_TOKEN_RE.test(t)) return true;
  if (
    INGREDIENT_HINT_RE.test(t) &&
    /\b(glycinate|citrate|oxide|extract|malate|threonate|picolinate|vitamin|magnesium)\b/i.test(
      t
    )
  ) {
    return true;
  }
  return false;
}
