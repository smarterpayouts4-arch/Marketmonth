import type { TopicCategoryId } from "@/brain/content/topic-category";

import type { TopicSubjectKind } from "../topic-subject";

/** Preferred subject kinds per category (order = fit strength). */
export const PREFERRED_KINDS: Record<TopicCategoryId, TopicSubjectKind[]> = {
  customer_questions: [
    "faq_topic",
    "decision_criterion",
    "audience_problem",
    "comparison_attribute",
  ],
  product_education: [
    "health_outcome",
    "catalog_product",
    "ingredient_or_component",
    "product_category",
    "comparison_attribute",
    "faq_topic",
  ],
  trust_proof: ["trust_method", "brand_position", "faq_topic"],
  offers_conversion: [
    "platform_capability",
    "comparison_attribute",
    "brand_position",
    "faq_topic",
  ],
};

export function preferredKindBoost(
  kind: TopicSubjectKind,
  objective: TopicCategoryId
): number {
  const pref = PREFERRED_KINDS[objective];
  const idx = pref.indexOf(kind);
  if (idx === -1) return 0.25;
  return 1 - idx * 0.12;
}
