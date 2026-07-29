import type { ContentBrainContext } from "@/brain/content/types";

import { isMetaInstructionalPhrase } from "../topic-meta";
import {
  clampLabel,
  evidenceForField,
  normalizeOpportunityLabel,
  pushUnique,
} from "./helpers";
import { typedCommerceAttribute } from "./commerce-attributes";
import { COMPARISON_ATTR_RE } from "./ingredient-patterns";
import type { TopicSubject } from "./types";

export function extractComparisonAttributes(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];

  // P2.3: typed comparison attrs from commercial fields — a published term
  // of sale mentioning price/shipping/returns/warranty grounds a comparison
  // attribute for any industry, with the typed row as evidence.
  (context.commercialTerms ?? []).forEach((term, i) => {
    const label = term.label?.trim();
    if (!label) return;
    const attr = typedCommerceAttribute(label);
    if (!attr) return;
    const evidenceIds = evidenceForField(context, label).length
      ? evidenceForField(context, label)
      : evidenceForField(context, "commercial");
    pushUnique(out, {
      label: clampLabel(label, 72),
      kind: "comparison_attribute",
      sourceField: `commercialTerms[${i}]`,
      evidenceIds,
      classificationReason: `Typed commercial term describes a ${attr} attribute buyers compare`,
      classificationConfidence: "high",
    });
  });

  // Catalog price coverage: two or more priced records make price a
  // grounded comparison attribute across the range.
  const priced = (context.indexedProducts ?? []).filter((p) =>
    p.price?.trim()
  );
  if (priced.length >= 2) {
    const evidenceIds = evidenceForField(context, priced[0]!.name);
    pushUnique(out, {
      label: "Price differences across the product range",
      kind: "comparison_attribute",
      sourceField: "indexedProducts.price",
      evidenceIds,
      classificationReason:
        "Multiple typed catalog records publish prices — price is a grounded comparison attribute",
      classificationConfidence: "high",
    });
  }
  const ops = [
    ...context.contentOpportunities,
    context.marketingOpportunity ?? "",
  ].filter(Boolean);

  for (const o of ops) {
    if (isMetaInstructionalPhrase(o)) continue;
    if (!COMPARISON_ATTR_RE.test(o)) continue;
    // Help-imperatives belong to audience extraction after normalize
    if (/^(Help|Helping)\b/i.test(o.trim())) continue;
    const label = normalizeOpportunityLabel(o);
    if (!label) continue;
    pushUnique(out, {
      label: clampLabel(label, 72),
      kind: "comparison_attribute",
      sourceField: "contentOpportunities",
      evidenceIds: evidenceForField(context, "contentOpportunities"),
      classificationReason:
        "Customer-facing opportunity describes comparison/label/price/brand attributes",
      classificationConfidence: "medium",
    });
  }
  return out;
}
