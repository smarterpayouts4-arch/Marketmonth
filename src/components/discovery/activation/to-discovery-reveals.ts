/**
 * Presentation formatter: SocialDiscoveryProfile → reveal view.
 * Formats only — never invents options or facts.
 */
import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";

import {
  REVEAL_LABELS,
  REVEAL_ORDER,
  type DiscoveryEvidence,
  type DiscoveryReveal,
  type DiscoveryRevealId,
} from "./types";
import { toEvidenceItems } from "./to-evidence-items";

export type DiscoveryActivationView = {
  reveals: DiscoveryReveal[];
  evidenceQuality: SocialDiscoveryProfile["evidenceQuality"];
  headerEvidenceLevel: "strong" | "moderate" | "low";
  introHeadline: string;
  introDescription: string;
  narrative: SocialDiscoveryProfile;
};

function bulletsToEvidence(
  section: SocialDiscoveryProfile["sections"][number]
): DiscoveryEvidence[] {
  return section.bullets.map((b) => ({
    text: b.text,
    kind: b.classification,
    confidence: b.evidence[0]?.confidence,
    sourceUrl: b.evidence[0]?.sourceUrl,
  }));
}

function sectionQuestion(id: DiscoveryRevealId): string {
  if (id === "doing-well") {
    return "What does this business already have that can support a strong social-media presence?";
  }
  if (id === "win") {
    return "What useful idea can this business become known for through consistent publishing?";
  }
  return "What should this business consistently publish, where, and how often?";
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function toDiscoveryActivation(
  profile: SocialDiscoveryProfile,
  options?: { voice?: "you" | "they"; businessName?: string }
): DiscoveryActivationView {
  void options;
  const byId = new Map(profile.sections.map((s) => [s.id, s]));
  const reveals: DiscoveryReveal[] = REVEAL_ORDER.map((id) => {
    const section = byId.get(id)!;
    const socialMeaning = section.socialMeaning?.trim();
    return {
      id,
      label: REVEAL_LABELS[id],
      question: sectionQuestion(id),
      insight: section.headline,
      insightEligible: profile.evidenceQuality !== "low",
      evidence: bulletsToEvidence(section),
      evidenceItems: toEvidenceItems(section),
      evidenceLevel:
        profile.evidenceQuality === "strong"
          ? "strong"
          : profile.evidenceQuality === "moderate"
            ? "moderate"
            : "low",
      clarification:
        profile.evidenceQuality === "low"
          ? "Low-evidence read — continue if this still matches the business, or try another website."
          : undefined,
      socialMeaning,
      reveal: section.reveal,
      transition: section.transition,
      // Keep the strip short so the card fits the first viewport.
      takeaway:
        id === "doing-well"
          ? "You already have the message. Market Month can turn it into a consistent publishing system."
          : id === "win"
            ? "Consistency turns one useful idea into recognition over time."
            : undefined,
    };
  });

  return {
    reveals,
    evidenceQuality: profile.evidenceQuality,
    headerEvidenceLevel:
      profile.evidenceQuality === "strong"
        ? "strong"
        : profile.evidenceQuality === "moderate"
          ? "moderate"
          : "low",
    introHeadline: profile.introHeadline,
    introDescription: profile.introDescription,
    narrative: profile,
  };
}
