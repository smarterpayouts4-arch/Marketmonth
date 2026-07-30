import type { ContentBrainContext } from "@/brain/content/types";

import { corpusSupportsSupplementRetailHeuristics } from "./corpus-industry";
import {
  PLATFORM_CAPABILITY_RE,
  REJECT_AS_INGREDIENT_LABEL_RE,
  looksLikeIngredientLabel,
} from "./ingredient-patterns";
import { buildContextTokenIndex, sharesCatalogToken } from "./context-tokens";
import { clampLabel, evidenceForField } from "./helpers";
import type { TopicSubject } from "./types";

/**
 * Classify a products[] / services[] string as platform vs ingredient hint.
 * Source field never determines kind alone — semantic rules do.
 * Bare products[] nouns are NOT catalog_product (use indexedProducts for that).
 */
export function classifyOfferNoun(
  label: string,
  sourceField: string,
  context: ContentBrainContext
): TopicSubject {
  const clipped = clampLabel(label, 48);
  const lower = clipped.toLowerCase();

  if (PLATFORM_CAPABILITY_RE.test(lower)) {
    return {
      label: clipped,
      kind: "platform_capability",
      sourceField,
      // Link by offer text — sourceField path ("products[0]") is not in evidence values.
      evidenceIds: evidenceForField(context, clipped),
      classificationReason:
        "Matches platform/tool phrasing (search, comparison, builder, filter, etc.)",
      classificationConfidence: "high",
    };
  }

  if (
    corpusSupportsSupplementRetailHeuristics(context) &&
    looksLikeIngredientLabel(clipped) &&
    !/\b(filter|filters)\b/i.test(lower)
  ) {
    return {
      label: clipped,
      kind: "ingredient_or_component",
      sourceField,
      evidenceIds: evidenceForField(context, clipped),
      classificationReason:
        "Explicit offer/catalog field with positive ingredient or form evidence",
      classificationConfidence: "high",
    };
  }

  // P2.3 CSV-token grounding: an offer noun that shares a significant token
  // with a typed catalog record is catalog-grounded for any industry —
  // no supplement lexicon required.
  if (sharesCatalogToken(clipped, buildContextTokenIndex(context))) {
    return {
      label: clipped,
      kind: "catalog_product",
      sourceField,
      evidenceIds: evidenceForField(context, clipped),
      classificationReason:
        "Offer noun corroborated by typed catalog record token (CSV-grounded)",
      classificationConfidence: "medium",
    };
  }

  return {
    label: clipped,
    kind: "catalog_product",
    sourceField,
    evidenceIds: evidenceForField(context, clipped),
    classificationReason:
      "Offer string without typed catalog evidence — not mined as catalog_product from products[] alone",
    classificationConfidence: "low",
  };
}

export function isSemanticallyValidCatalogName(name: string): boolean {
  const lower = name.toLowerCase();
  if (PLATFORM_CAPABILITY_RE.test(lower)) return false;
  if (REJECT_AS_INGREDIENT_LABEL_RE.test(name.trim())) return false;
  const tokens = name.trim().split(/\s+/).filter(Boolean);
  return tokens.length >= 2 || /^[A-Z0-9][\w-]{2,}$/.test(name.trim());
}
