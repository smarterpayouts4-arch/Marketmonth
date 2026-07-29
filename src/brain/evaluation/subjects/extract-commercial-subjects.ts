import type { ContentBrainContext } from "@/brain/content/types";

import { buildTopicEvidenceIndex } from "../evidence";
import { clampLabel, pushUnique } from "./helpers";
import type { TopicSubject } from "./types";

/**
 * Commercial terms of sale → brand_position subjects.
 * Distinct from catalog products; mapped via commercialTerms on context.
 */
export function extractCommercialSubjects(
  context: ContentBrainContext
): TopicSubject[] {
  const index = buildTopicEvidenceIndex(context);
  const out: TopicSubject[] = [];

  for (const term of context.commercialTerms ?? []) {
    const label = clampLabel(term.label, 80);
    if (!label || label.length < 3) continue;

    const evidenceIds = index.commercialTerms
      .filter(
        (i) => i.normalizedText.toLowerCase() === term.label.toLowerCase()
      )
      .map((i) => i.id)
      .slice(0, 3);
    if (!evidenceIds.length) continue;

    pushUnique(out, {
      label,
      kind: "brand_position",
      sourceField: "commercialTerms",
      evidenceIds,
      classificationReason:
        "Commercial term of sale supports offers/conversion framing",
      classificationConfidence: "high",
    });
  }
  return out.slice(0, 8);
}
