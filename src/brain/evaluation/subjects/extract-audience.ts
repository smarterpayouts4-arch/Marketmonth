import type { ContentBrainContext } from "@/brain/content/types";

import { isMetaInstructionalPhrase } from "../topic-meta";
import {
  evidenceForField,
  normalizeOpportunityLabel,
  pushUnique,
} from "./helpers";
import type { TopicSubject } from "./types";

export function extractAudienceProblems(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
  if (context.audience?.trim()) {
    const label = normalizeOpportunityLabel(context.audience);
    if (label) {
      pushUnique(out, {
        label,
        kind: "audience_problem",
        sourceField: "audience",
        evidenceIds: evidenceForField(context, "audience"),
        classificationReason: "Audience field describes who struggles and why",
        classificationConfidence: "high",
      });
    }
  }
  if (
    context.marketingOpportunity?.trim() &&
    !isMetaInstructionalPhrase(context.marketingOpportunity)
  ) {
    const label = normalizeOpportunityLabel(context.marketingOpportunity);
    if (label) {
      pushUnique(out, {
        label,
        kind: "audience_problem",
        sourceField: "marketingOpportunity",
        evidenceIds: evidenceForField(context, "marketingOpportunity"),
        classificationReason: "Marketing opportunity framed as audience need",
        classificationConfidence: "medium",
      });
    }
  }
  return out;
}
