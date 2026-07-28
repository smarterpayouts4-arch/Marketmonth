import type { ContentBrainContext } from "@/brain/content/types";

import {
  PLATFORM_CAPABILITY_RE,
  REJECT_AS_INGREDIENT_LABEL_RE,
  looksLikeIngredientLabel,
} from "./ingredient-patterns";
import { clampLabel, evidenceForField } from "./helpers";
import type { TopicSubject } from "./types";

/**
 * Classify a products[] / services[] string as platform vs ingredient hint.
 * Source field never determines kind alone — semantic rules do.
 * Bare products[] nouns are NOT catalog_product (use catalogProducts for that).
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
      evidenceIds: evidenceForField(context, sourceField),
      classificationReason:
        "Matches platform/tool phrasing (search, comparison, builder, filter, etc.)",
      classificationConfidence: "high",
    };
  }

  if (
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
