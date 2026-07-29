import type { TopicEvidenceSignalType } from "./signal-taxonomy";
import type { EvidenceClassification, EvidenceConfidence } from "./score";

export type TopicEvidenceItem = {
  id: string;
  recordType: string;
  field: string;
  value: string;
  normalizedText: string;
  sourceUrl: string;
  evidenceType: EvidenceClassification;
  confidence: EvidenceConfidence;
  sourceSnippet?: string;
  qualityScore: number;
  signalType: TopicEvidenceSignalType;
};

export type TopicEvidenceIndex = {
  itemsById: Record<string, TopicEvidenceItem>;
  items: TopicEvidenceItem[];
  faqs: TopicEvidenceItem[];
  commercialTerms: TopicEvidenceItem[];
  bySignalType: Partial<Record<TopicEvidenceSignalType, TopicEvidenceItem[]>>;
};
