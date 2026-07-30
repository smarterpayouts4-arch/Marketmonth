import type { ContentBrainContext } from "@/brain/content/types";

import { corpusSupportsSupplementRetailHeuristics } from "./corpus-industry";
import {
  clampLabel,
  evidenceForField,
  normalizeCategoryLabel,
  pushUnique,
} from "./helpers";
import { CATEGORY_RE } from "./ingredient-patterns";
import type { TopicSubject } from "./types";

export function extractProductCategories(
  context: ContentBrainContext
): TopicSubject[] {
  const out: TopicSubject[] = [];
  // Supplement/vitamin category nouns only when the corpus already uses them.
  if (!corpusSupportsSupplementRetailHeuristics(context)) return out;
  const narrative = [
    context.description,
    context.audience,
    context.valueProposition,
  ]
    .filter(Boolean)
    .join(" ");
  if (CATEGORY_RE.test(narrative)) {
    const match = narrative.match(CATEGORY_RE);
    if (match) {
      const label = normalizeCategoryLabel(match[0]);
      pushUnique(out, {
        label: clampLabel(label, 40),
        kind: "product_category",
        sourceField: "description|audience|valueProposition",
        evidenceIds: evidenceForField(context, "description"),
        classificationReason: "Category noun grounded in brand narrative",
        classificationConfidence: "medium",
      });
    }
  }
  return out;
}
