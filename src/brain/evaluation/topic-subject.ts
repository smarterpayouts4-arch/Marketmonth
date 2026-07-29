/**
 * Thin orchestrator / public surface for topic subject classification.
 * Implementation lives under subjects/ (3-letter-style ownership folder).
 */
export { classifyOfferNoun } from "./subjects/classify-offer";
export { extractPlatformCapabilities } from "./subjects/extract-platform";
export { extractProductSubjects } from "./subjects/extract-products";
export { extractOutcomeSubjects } from "./subjects/extract-outcome-subjects";
export { extractComparisonAttributes } from "./subjects/extract-comparison";
export { extractAudienceProblems } from "./subjects/extract-audience";
export { extractProductCategories } from "./subjects/extract-categories";
export { extractBrandPosition } from "./subjects/extract-brand";
export { extractCommercialSubjects } from "./subjects/extract-commercial-subjects";
export { extractDecisionCriteria } from "./subjects/extract-decision";
export { extractTrustMethods } from "./subjects/extract-trust";
export { extractSignalSubjects } from "./subjects/extract-signal-subjects";
export {
  classifyContextSubjects,
  isPrimaryProductEducationSubject,
  isProductEducationEligible,
} from "./subjects/classify";
export type {
  TopicSubjectKind,
  ClassificationConfidence,
  TopicSubjectSourceType,
  TopicSubject,
} from "./subjects/types";
