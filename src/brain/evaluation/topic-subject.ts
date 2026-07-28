/**
 * Thin orchestrator / public surface for topic subject classification.
 * Implementation lives under subjects/ (3-letter-style ownership folder).
 */
export {
  classifyOfferNoun,
  extractPlatformCapabilities,
  extractProductSubjects,
  extractComparisonAttributes,
  extractAudienceProblems,
  extractProductCategories,
  extractBrandPosition,
  extractDecisionCriteria,
  extractTrustMethods,
  classifyContextSubjects,
  isPrimaryProductEducationSubject,
  isProductEducationEligible,
  type TopicSubjectKind,
  type ClassificationConfidence,
  type TopicSubjectSourceType,
  type TopicSubject,
} from "./subjects/context-subjects";
