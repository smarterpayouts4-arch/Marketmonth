/** UI-facing discovery narrative models - presentation only; no engine imports. */

import type {
  CadenceLevel,
  DiscoveryClassification,
  DiscoveryConfidence,
  SocialDiscoveryProfile,
} from "@/lib/discovery/discovery-narrative.schema";
import type { CardRowCopy } from "@/lib/discovery/card-copy";

export type DiscoveryEvidenceKind = DiscoveryClassification;
export type DiscoveryEvidence = {
  text: string;
  kind: DiscoveryClassification;
  confidence?: DiscoveryConfidence;
  sourceUrl?: string;
};

/** Compact accordion row shaped from a grounded section bullet. */
export type DiscoveryEvidenceItem = CardRowCopy;

export type DiscoveryRevealId = "doing-well" | "win" | "content-play";

export type DiscoveryReveal = {
  id: DiscoveryRevealId;
  label: string;
  question: string;
  insight: string;
  evidence: DiscoveryEvidence[];
  /** Compact accordion rows (preferred UI). */
  evidenceItems: DiscoveryEvidenceItem[];
  clarification?: string;
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
