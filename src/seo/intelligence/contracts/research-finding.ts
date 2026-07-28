export type FindingImpact = "High" | "Medium" | "Low" | "None";
export type FindingConfidence = "Confirmed" | "Probable" | "Experimental";
export type FindingStatus =
  | "New"
  | "Accepted"
  | "Rejected"
  | "Implemented"
  | "Recheck later";

export type ResearchEvidence = {
  source: string;
  url?: string;
  publishedAt?: string;
  excerpt: string;
};

export type ResearchFinding = {
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
