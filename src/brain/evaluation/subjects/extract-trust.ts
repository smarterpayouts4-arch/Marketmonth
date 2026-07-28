import type { ContentBrainContext } from "@/brain/content/types";

import { isMetaInstructionalPhrase } from "../topic-meta";
import {
  clampLabel,
  evidenceForField,
  pushUnique,
} from "./helpers";
import type { TopicSubject } from "./types";

export function extractTrustMethods(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
  const voice = context.brandVoice?.trim();
  if (voice) {
    pushUnique(out, {
      label: clampLabel(voice, 64),
      kind: "trust_method",
      sourceField: "brandVoice",
      evidenceIds: evidenceForField(context, "brandVoice"),
      classificationReason:
        "Brand voice encodes transparency / non-medical limits",
      classificationConfidence: "medium",
    });
  }
  for (const o of context.contentOpportunities) {
    if (isMetaInstructionalPhrase(o)) continue;
    if (
      /\b(transparent|methodology|sponsored|proof|trust|credibility)\b/i.test(o)
    ) {
      pushUnique(out, {
        label: clampLabel(o, 72),
        kind: "trust_method",
        sourceField: "contentOpportunities",
        evidenceIds: evidenceForField(context, "contentOpportunities"),
        classificationReason:
          "Opportunity describes transparency or methodology",
        classificationConfidence: "medium",
      });
    }
  }
  return out;
}
