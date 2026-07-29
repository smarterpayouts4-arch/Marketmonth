export {
  sanitizeEvidenceValue,
  isRejectedEvidence,
  isNavChrome,
  segmentCamelGlued,
  failsGenericInsight,
  looksClipped,
  normalizeWhitespace,
  normalizeUrlVariant,
  isPlaceholderRetrievedAt,
} from "./sanitize";

export {
  scoreEvidenceQuality,
  type EvidenceClassification,
  type EvidenceConfidence,
  type ScoreEvidenceQualityInput,
} from "./score";

export {
  deduplicateEvidenceItems,
  compareEvidencePriority,
} from "./dedupe";

export {
  parseStructuredEvidenceValue,
  isStructuredEvidenceField,
  asClassification,
  asConfidence,
} from "./parse-structured";

export {
  classifyEvidenceSignalType,
  isCommercialTermSignal,
  isProofQualitySignal,
  type TopicEvidenceSignalType,
} from "./signal-taxonomy";

export { buildTopicEvidenceIndex } from "./index-evidence";

export {
  selectEvidenceForCategory,
  type SelectEvidenceOptions,
} from "./select-for-category";

export type { TopicEvidenceItem, TopicEvidenceIndex } from "./types";
