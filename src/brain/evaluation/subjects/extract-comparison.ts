import type { ContentBrainContext } from "@/brain/content/types";

import { isMetaInstructionalPhrase } from "../topic-meta";
import {
  clampLabel,
  evidenceForField,
  normalizeOpportunityLabel,
  pushUnique,
} from "./helpers";
import { COMPARISON_ATTR_RE } from "./ingredient-patterns";
import type { TopicSubject } from "./types";

export function extractComparisonAttributes(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
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
