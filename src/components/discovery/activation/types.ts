/** UI-facing discovery activation models — presentation only; no engine imports. */

import type {
  ActivationConfidence,
  ActivationEvidence,
  DiscoveryActivationProfile,
  DiscoveryOption,
} from "@/lib/discovery/activation-profile";

export type DiscoveryEvidenceKind = ActivationEvidence["kind"];
export type DiscoveryEvidence = ActivationEvidence;

export type DiscoveryRevealId =
  | "brand-core"
  | "buyer-tension"
  | "lead-offer"
  | "growth-opening";

export type DiscoveryReveal = {
  id: DiscoveryRevealId;
  label: string;
  question: string;
  insight: string;
  insightEligible: boolean;
  evidence: DiscoveryEvidence[];
  evidenceLevel: "strong" | "moderate" | "low";
  clarification?: string;
};

/** Dynamic growth option id from grounded activation profile. */
export type GrowthDirectionId = string;

export type GrowthDirectionOption = {
  id: GrowthDirectionId;
  title: string;
  description: string;
  recommended?: boolean;
  confidence: ActivationConfidence;
  evidence: DiscoveryEvidence[];
  strategyGoal: "awareness" | "leads" | "sales" | "loyalty";
  thesis: string;
};

export type ChoiceOption = {
  id: string;
  label: string;
  explanation: string;
  confidence: ActivationConfidence;
  evidence: DiscoveryEvidence[];
  recommended?: boolean;
};

export type DiscoveryInvestments = {
  brandCoreEdit?: string;
  buyerTension?: string;
  leadOffer?: string;
  growthDirection: GrowthDirectionId;
  growthThesis: string;
  strategyGoal: "awareness" | "leads" | "sales" | "loyalty";
};

export type StrategyInfluence = {
  investmentField: keyof DiscoveryInvestments;
  selectedValue: string;
  affectedOutputs: string[];
};

export const REVEAL_ORDER: DiscoveryRevealId[] = [
  "brand-core",
  "buyer-tension",
  "lead-offer",
  "growth-opening",
];

export const REVEAL_LABELS: Record<DiscoveryRevealId, string> = {
  "brand-core": "Customer Value",
  "buyer-tension": "Buyer Moment",
  "lead-offer": "Lead Offer",
  "growth-opening": "Growth Direction",
};

export type { DiscoveryActivationProfile, DiscoveryOption };
