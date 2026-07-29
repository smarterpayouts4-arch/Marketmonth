import type { MarketingFocus } from "@/brain/content/marketing-focus";

import type { TopicSubjectKind } from "../topic-subject";

/** Preferred subject kinds per objective (order = fit strength). */
export const PREFERRED_KINDS: Record<MarketingFocus, TopicSubjectKind[]> = {
  brand_awareness: [
    "brand_position",
    "audience_problem",
    "product_category",
  ],
  value_proposition: [
    "platform_capability",
    "brand_position",
    "audience_problem",
  ],
  product_education: [
    "catalog_product",
    "ingredient_or_component",
    "product_category",
    "comparison_attribute",
    "faq_topic",
  ],
  decision_support: ["decision_criterion", "comparison_attribute", "faq_topic"],
  trust_authority: ["trust_method", "brand_position", "faq_topic"],
};

export function preferredKindBoost(
  kind: TopicSubjectKind,
  objective: MarketingFocus
): number {
  const pref = PREFERRED_KINDS[objective];
  const idx = pref.indexOf(kind);
  if (idx === -1) return 0.25;
  return 1 - idx * 0.12;
}
