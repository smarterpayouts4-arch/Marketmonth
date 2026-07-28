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

export function extractDecisionCriteria(
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
    const label = normalizeOpportunityLabel(o);
    if (!label) continue;
    // Help-imperative opportunities are normalized to audience phrases —
    // do not also seed them as decision criteria (avoids triple-ingest).
    if (/^(Help|Helping)\b/i.test(o.trim())) continue;
    pushUnique(out, {
      label: clampLabel(label, 72),
      kind: "decision_criterion",
      sourceField: "contentOpportunities",
      evidenceIds: evidenceForField(context, "contentOpportunities"),
      classificationReason:
        "Opportunity describes purchase/evaluation criteria for shoppers",
      classificationConfidence: "medium",
    });
  }
  return out;
}
