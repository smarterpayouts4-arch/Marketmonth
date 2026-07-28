/**
 * Presentation formatter: grounded DiscoveryActivationProfile → reveal view.
 * Does not invent options, insights, or industry-specific choices.
 */
import type { DiscoveryActivationProfile } from "@/lib/discovery/activation-profile";

import type {
  ChoiceOption,
  DiscoveryEvidence,
  DiscoveryReveal,
  GrowthDirectionId,
  GrowthDirectionOption,
} from "./types";
import { REVEAL_LABELS } from "./types";

export type DiscoveryActivationView = {
  businessName: string;
  headerEvidenceLevel: DiscoveryReveal["evidenceLevel"];
  reveals: DiscoveryReveal[];
  growthDirections: GrowthDirectionOption[];
  recommendedGrowthDirection: GrowthDirectionId | undefined;
  buyerTensionOptions: ChoiceOption[];
  leadOfferOptions: ChoiceOption[];
  evidenceQuality: DiscoveryActivationProfile["evidenceQuality"];
};

/** Word count for tests / validation (not for chopping UI strings). */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function confidenceToLevel(
  confidence: "high" | "medium" | "low",
  evidenceQuality: DiscoveryActivationProfile["evidenceQuality"]
): DiscoveryReveal["evidenceLevel"] {
  if (confidence === "low" || evidenceQuality === "low") return "low";
  if (confidence === "high" && evidenceQuality === "strong") return "strong";
  return "moderate";
}

function mapChoice(opt: {
  id: string;
  label: string;
  explanation: string;
  confidence: "high" | "medium" | "low";
  evidence: DiscoveryEvidence[];
  recommended?: boolean;
}): ChoiceOption {
  return {
    id: opt.id,
    label: opt.label,
    explanation: opt.explanation,
    confidence: opt.confidence,
    evidence: opt.evidence,
    recommended: opt.recommended,
  };
}

/**
 * Format a grounded activation profile for the Hook UI.
 * Voice only affects optional they-mode naming — questions are owner-facing.
 */
export function toDiscoveryActivation(
  profile: DiscoveryActivationProfile,
  options?: {
    voice?: "you" | "they";
    businessName?: string;
  }
): DiscoveryActivationView {
  const name = options?.businessName?.trim() || "Your brand";
  const quality = profile.evidenceQuality;

  const qBrand = "Does this capture the value your customers are buying?";
  const qTension = "When does this problem feel most urgent?";
  const qLead = "Which offer should people remember first?";
  const qGrowth = "Which idea should shape your content this month?";

  const brandLevel = confidenceToLevel(profile.brandCore.confidence, quality);
  const tensionHigh = profile.buyerTensions.some((t) => t.confidence === "high");
  const offerHigh = profile.leadOffers.some((o) => o.confidence === "high");
  const growthHigh = profile.growthDirections.some(
    (g) => g.confidence === "high"
  );

  const recommendedOffer =
    profile.leadOffers.find((o) => o.recommended) || profile.leadOffers[0];

  const tensionClarification =
    !tensionHigh && profile.buyerTensions.every((t) => t.confidence === "low")
      ? "Your website describes several services, but we could not confidently identify one dominant buyer moment."
      : undefined;

  const leadClarification =
    profile.leadOffers.length === 0
      ? "We could not detect a clear product or service to lead with. Clarify what people should remember first."
      : undefined;

  const growthClarification =
    !growthHigh &&
    profile.growthDirections.every((g) => g.confidence === "low")
      ? "We could not derive a site-specific growth direction with confidence. Pick a neutral starting point or refine later."
      : undefined;

  const reveals: DiscoveryReveal[] = [
    {
      id: "brand-core",
      label: REVEAL_LABELS["brand-core"],
      question: qBrand,
      insight: profile.brandCore.insight,
      insightEligible: profile.brandCore.confidence !== "low",
      evidence: profile.brandCore.evidence,
      evidenceLevel: brandLevel,
      clarification: profile.brandCore.clarification,
    },
    {
      id: "buyer-tension",
      label: REVEAL_LABELS["buyer-tension"],
      question: qTension,
      insight: tensionHigh
        ? profile.buyerTensions.find((t) => t.recommended)?.explanation ||
          profile.buyerTensions[0]?.explanation ||
          ""
        : tensionClarification ||
          "The urgent buyer moment is not yet clear from the website.",
      insightEligible: Boolean(tensionHigh),
      evidence: profile.buyerTensions[0]?.evidence.slice(0, 3) ?? [],
      evidenceLevel: confidenceToLevel(tensionHigh ? "high" : "low", quality),
      clarification: tensionClarification,
    },
    {
      id: "lead-offer",
      label: REVEAL_LABELS["lead-offer"],
      question: qLead,
      insight: offerHigh
        ? `Your site leads with ${recommendedOffer?.label ?? "its primary offer"} — keep it first?`
        : leadClarification ||
          "Confirm which offer people should remember first.",
      insightEligible: Boolean(offerHigh),
      evidence: recommendedOffer?.evidence.slice(0, 3) ?? [
        {
          text: "No clear lead offer was detected on the website.",
          kind: "observed",
          confidence: "low",
        },
      ],
      evidenceLevel: confidenceToLevel(offerHigh ? "high" : "low", quality),
      clarification: leadClarification,
    },
    {
      id: "growth-opening",
      label: REVEAL_LABELS["growth-opening"],
      question: qGrowth,
      insight:
        profile.growthDirections.find((g) => g.recommended)?.explanation ||
        profile.growthDirections[0]?.explanation ||
        growthClarification ||
        "Choose a content idea the brand can own.",
      insightEligible: Boolean(growthHigh),
      evidence:
        profile.growthDirections.find((g) => g.recommended)?.evidence.slice(0, 3) ??
        profile.growthDirections[0]?.evidence.slice(0, 3) ??
        [],
      evidenceLevel: confidenceToLevel(growthHigh ? "high" : "low", quality),
      clarification: growthClarification,
    },
  ];

  const growthDirections: GrowthDirectionOption[] = profile.growthDirections.map(
    (g) => ({
      id: g.id,
      title: g.label,
      description: g.explanation,
      recommended: g.recommended,
      confidence: g.confidence,
      evidence: g.evidence,
      strategyGoal: g.strategyGoal ?? "awareness",
      thesis: g.explanation,
    })
  );

  const recommendedGrowthDirection =
    growthDirections.find((g) => g.recommended)?.id ?? growthDirections[0]?.id;

  return {
    businessName: name,
    headerEvidenceLevel: brandLevel,
    reveals,
    growthDirections,
    recommendedGrowthDirection,
    buyerTensionOptions: profile.buyerTensions.map(mapChoice),
    leadOfferOptions: profile.leadOffers.map(mapChoice),
    evidenceQuality: quality,
  };
}
