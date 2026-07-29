/** UI-facing discovery narrative models — presentation only; no engine imports. */

import type {
  CadenceLevel,
  DiscoveryClassification,
  DiscoveryConfidence,
  SocialDiscoveryProfile,
} from "@/lib/discovery/discovery-narrative.schema";

export type DiscoveryEvidenceKind = DiscoveryClassification;
export type DiscoveryEvidence = {
  text: string;
  kind: DiscoveryClassification;
  confidence?: DiscoveryConfidence;
  sourceUrl?: string;
};

/** Compact accordion row shaped from a grounded section bullet. */
export type DiscoveryEvidenceItem = {
  id: string;
  title: string;
  summary: string;
  detail: string;
  supportingPoints: string[];
  sourceLabel: string;
  sourceUrl?: string;
  tag?: string;
  kind: DiscoveryClassification;
};

export type DiscoveryRevealId = "doing-well" | "win" | "content-play";

export type DiscoveryReveal = {
  id: DiscoveryRevealId;
  label: string;
  question: string;
  insight: string;
  insightEligible: boolean;
  evidence: DiscoveryEvidence[];
  /** Compact accordion rows (preferred UI). */
  evidenceItems: DiscoveryEvidenceItem[];
  evidenceLevel: "strong" | "moderate" | "low";
  clarification?: string;
  socialMeaning?: string;
  reveal: string;
  transition?: string;
  /** Concise takeaway for the pale strip (interpretation, not raw evidence). */
  takeaway?: string;
};

/** Investment after all three strategic rewards are shown. */
export type DiscoveryInvestments = {
  cadenceLevel: CadenceLevel;
  channels: string[];
  pillarId?: string;
  contentDirectionEdit?: string;
};

export const REVEAL_ORDER: DiscoveryRevealId[] = [
  "doing-well",
  "win",
  "content-play",
];

export const REVEAL_LABELS: Record<DiscoveryRevealId, string> = {
  "doing-well": "What You’re Doing Well",
  win: "Where You Can Win",
  "content-play": "Your Content Play",
};

export type { SocialDiscoveryProfile, CadenceLevel };
