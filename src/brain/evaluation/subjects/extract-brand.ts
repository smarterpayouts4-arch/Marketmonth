import type { ContentBrainContext } from "@/brain/content/types";

import {
  clampLabel,
  evidenceForField,
  pushUnique,
} from "./helpers";
import type { TopicSubject } from "./types";

export function extractBrandPosition(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
  if (context.valueProposition?.trim()) {
    pushUnique(out, {
      label: clampLabel(context.valueProposition, 80),
      kind: "brand_position",
      sourceField: "valueProposition",
      evidenceIds: evidenceForField(context, "valueProposition"),
      classificationReason: "Value proposition states brand positioning outcome",
      classificationConfidence: "high",
    });
  }
  pushUnique(out, {
    label: context.brandName,
    kind: "brand_position",
    sourceField: "brandName",
    evidenceIds: evidenceForField(context, "businessName"),
    classificationReason: "Brand identity for recognition framing",
    classificationConfidence: "high",
  });
  return out;
}
