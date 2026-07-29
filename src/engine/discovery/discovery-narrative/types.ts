import type {
  DiscoveryClassification,
  DiscoveryConfidence,
} from "@/lib/discovery/discovery-narrative.schema";

export type EvidenceRecordType =
  | "brand_profile"
  | "evidence"
  | "faq"
  | "signal"
  | "offer";

export type EvidenceItem = {
  id: string;
  recordType: EvidenceRecordType;
  field: string;
  value: unknown;
  normalizedText?: string;
  sourceUrl: string;
  evidenceType: DiscoveryClassification;
  confidence: DiscoveryConfidence;
  sourceSnippet?: string;
  qualityScore: number;
};

export type SignalCategory =
  | "businessIdentity"
  | "customerProblem"
  | "valueMechanism"
  | "trustSignals"
  | "offerInventory"
  | "contentInventory"
  | "socialFootprint"
  | "conversionPaths";

export type BrandSignalGraph = Record<SignalCategory, EvidenceItem[]>;
