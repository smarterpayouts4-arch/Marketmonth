import type {
  FindingConfidence,
  FindingImpact,
  FindingStatus,
  ResearchEvidence,
} from "./research-finding";

/** SEO Change Brief item — recommend-only until human approval. */
export type SeoRecommendation = {
  id: string;
  finding: string;
  whyItMatters: string;
  evidence: ResearchEvidence;
  impact: FindingImpact;
  affectedSurfaces: string[];
  affectedFiles: string[];
  recommendation: string;
  confidence: FindingConfidence;
  status: FindingStatus;
  createdAt: string;
  updatedAt: string;
};

export type SeoChangeBrief = {
  id: string;
  generatedAt: string;
  kind: "weekly" | "on-demand" | "site-change";
  snapshotSummary: string;
  recommendations: SeoRecommendation[];
  newCount: number;
  highPriorityCount: number;
  changesSincePrevious: number;
  staleAfterDays: number;
};
