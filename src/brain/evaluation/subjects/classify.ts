import type { ContentBrainContext } from "@/brain/content/types";

import { extractAudienceProblems } from "./extract-audience";
import { extractBrandPosition } from "./extract-brand";
import { extractCommercialSubjects } from "./extract-commercial-subjects";
import { extractComparisonAttributes } from "./extract-comparison";
import { extractProductCategories } from "./extract-categories";
import { extractDecisionCriteria } from "./extract-decision";
import { extractFaqSubjects } from "./extract-faq-subjects";
import { extractOutcomeSubjects } from "./extract-outcome-subjects";
import { extractPlatformCapabilities } from "./extract-platform";
import { extractProductSubjects } from "./extract-products";
import { extractSignalSubjects } from "./extract-signal-subjects";
import { extractTrustMethods } from "./extract-trust";
import type { TopicSubject, TopicSubjectKind } from "./types";

/** Full classified subject inventory for strategy builders (kinds frozen). */
export function classifyContextSubjects(
  context: ContentBrainContext
): TopicSubject[] {
  return [
    ...extractPlatformCapabilities(context),
    ...extractProductSubjects(context),
    ...extractOutcomeSubjects(context),
    ...extractProductCategories(context),
    ...extractComparisonAttributes(context),
    ...extractAudienceProblems(context),
    ...extractBrandPosition(context),
    ...extractCommercialSubjects(context),
    ...extractDecisionCriteria(context),
    ...extractTrustMethods(context),
    ...extractFaqSubjects(context),
    ...extractSignalSubjects(context),
  ];
}

/**
 * Primary Product education subjects: catalog / ingredient / category
 * at high or medium confidence only.
 */
export function isPrimaryProductEducationSubject(s: TopicSubject): boolean {
  const productKinds: TopicSubjectKind[] = [
    "health_outcome",
    "catalog_product",
    "ingredient_or_component",
    "product_category",
  ];
  if (!productKinds.includes(s.kind)) return false;
  return (
    s.classificationConfidence === "high" ||
    s.classificationConfidence === "medium"
  );
}

export function isProductEducationEligible(s: TopicSubject): boolean {
  if (s.kind === "platform_capability") return false;
  if (
    s.kind === "health_outcome" ||
    s.kind === "catalog_product" ||
    s.kind === "ingredient_or_component" ||
    s.kind === "product_category"
  ) {
    return (
      s.classificationConfidence === "high" ||
      s.classificationConfidence === "medium"
    );
  }
  if (s.kind === "comparison_attribute") {
    return (
      s.classificationConfidence === "high" ||
      s.classificationConfidence === "medium"
    );
  }
  return false;
}
