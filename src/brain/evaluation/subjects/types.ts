export type TopicSubjectKind =
  | "catalog_product"
  | "product_category"
  | "ingredient_or_component"
  | "comparison_attribute"
  | "audience_problem"
  | "platform_capability"
  | "brand_position"
  | "decision_criterion"
  | "trust_method"
  | "faq_topic";

export type ClassificationConfidence = "high" | "medium" | "low";

/**
 * Classified noun from brand context. Kind is immutable after extraction —
 * strategies must not re-label.
 */
export type TopicSubjectSourceType = "brand_observed" | "industry_research";

export type TopicSubject = {
  label: string;
  kind: TopicSubjectKind;
  sourceField: string;
  evidenceIds: string[];
  classificationReason: string;
  classificationConfidence: ClassificationConfidence;
  /** Defaults to brand_observed when omitted (Discovery/CSV). */
  sourceType?: TopicSubjectSourceType;
  /**
   * Completeness family for industry research — same source page / opportunity
   * must not unlock multiple distinct support keys via framing alone.
   */
  supportFamilyKey?: string;
};
