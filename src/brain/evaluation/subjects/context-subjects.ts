/**
 * Compatibility barrel for subject classification.
 * Prefer importing from classify / extract-* modules or topic-subject.ts.
 */
export type {
  TopicSubjectKind,
  ClassificationConfidence,
  TopicSubjectSourceType,
  TopicSubject,
} from "./types";
export { classifyOfferNoun } from "./classify-offer";
export { extractPlatformCapabilities } from "./extract-platform";
export { extractProductSubjects } from "./extract-products";
export { extractComparisonAttributes } from "./extract-comparison";
export { extractAudienceProblems } from "./extract-audience";
export { extractProductCategories } from "./extract-categories";
export { extractBrandPosition } from "./extract-brand";
export { extractDecisionCriteria } from "./extract-decision";
export { extractTrustMethods } from "./extract-trust";
export {
  classifyContextSubjects,
  isPrimaryProductEducationSubject,
  isProductEducationEligible,
} from "./classify";
