/**
 * Social discovery narrative orchestrator.
 * Transforms approved-company evidence into a 3-section positive strategy.
 */
import type { BrandProfile } from "@/engine/discovery/brand-profile";
import type { OfferHint } from "@/engine/discovery/extract-offers";
import type { BrandSignals, FaqEntry } from "@/engine/discovery/types";
import type { CompanyProfileProjection } from "@/lib/company-profile/projection.schema";
import {
  socialDiscoveryProfileSchema,
  type SocialDiscoveryProfile,
} from "@/lib/discovery/discovery-narrative.schema";

import { recommendCadence, scoreContentInventory } from "./cadence";
import {
  buildContentUniverse,
  deriveOwnedIdea,
} from "./content-universe";
import { activationInputToProjection } from "./from-activation-input";
import { buildEvidenceIndex } from "./normalize/build-evidence-index";
import { isHeadlineEligible } from "./normalize/score-evidence";
import {
  buildPlatformAdaptations,
  detectChannels,
} from "./platform-mapping";
import { buildContentPlaySection, deriveContentPillars } from "./sections/content-play";
import { buildDoingWellSection } from "./sections/doing-well";
import { buildWinSection } from "./sections/win";
import { buildBrandSignalGraph } from "./signal-graph";

export type BuildDiscoveryNarrativeInput =
  | { projection: CompanyProfileProjection }
  | {
      brandProfile: BrandProfile;
      signals?: BrandSignals | null;
      faqs?: FaqEntry[];
      offerHints?: Array<OfferHint | string>;
    };

function resolveProjection(
  input: BuildDiscoveryNarrativeInput
): CompanyProfileProjection {
  if ("projection" in input) return input.projection;
  return activationInputToProjection({
    brandProfile: input.brandProfile,
    signals: input.signals,
    faqs: input.faqs,
    offerHints: input.offerHints?.map((h) =>
      typeof h === "string" ? { label: h } : h
    ),
  });
}

export function buildDiscoveryNarrative(
  input: BuildDiscoveryNarrativeInput
): SocialDiscoveryProfile {
  const projection = resolveProjection(input);
  const evidence = buildEvidenceIndex(projection);
  const graph = buildBrandSignalGraph(evidence);
  const channels = detectChannels(projection);
  const platforms = buildPlatformAdaptations(channels, graph);
  const inventory = scoreContentInventory(projection, graph, channels);
  const cadence = recommendCadence(inventory);
  const ownedIdea = deriveOwnedIdea(graph, projection.businessName);
  const pillars = deriveContentPillars(graph, projection.businessName);
  const universe = buildContentUniverse({
    businessName: projection.businessName,
    graph,
    ownedIdea,
    platforms,
  });

  const doingWell = buildDoingWellSection({
    businessName: projection.businessName,
    graph,
    channels,
  });
  const win = buildWinSection({
    businessName: projection.businessName,
    graph,
    channels,
    ownedIdea,
  });
  const contentPlay = buildContentPlaySection({
    businessName: projection.businessName,
    graph,
    pillars,
    cadenceLabel: cadence.label,
    ownedIdea,
  });

  const strong =
    isHeadlineEligible([
      ...graph.businessIdentity,
      ...graph.valueMechanism,
      ...graph.trustSignals,
    ]) &&
    (graph.contentInventory.length >= 2 || graph.valueMechanism.length >= 2);

  const profile: SocialDiscoveryProfile = {
    businessName: projection.businessName,
    introHeadline: strong
      ? "Your website gives us a strong foundation."
      : "Your website gives us a starting point.",
    introDescription: strong
      ? "We studied your business and found the strongest social-media story already inside it."
      : "Help us sharpen the decisions that will shape what you publish this month.",
    sections: [doingWell, win, contentPlay],
    contentPillars: pillars,
    platformAdaptations: platforms,
    detectedChannels: channels,
    cadence,
    contentUniversePreview: universe,
    finalDirection: `Make ${projection.businessName} known for helping people move toward “${ownedIdea.toLowerCase()}” through connected, evidence-minded content.`,
    investmentQuestion: "How consistently should we build your plan?",
    primaryCta: "Build my content month",
    secondaryCta: "Try another website",
    evidenceQuality: strong ? "strong" : inventory.score >= 12 ? "moderate" : "low",
  };

  return socialDiscoveryProfileSchema.parse(profile);
}

export { buildEvidenceIndex } from "./normalize/build-evidence-index";
export { buildBrandSignalGraph } from "./signal-graph";
export { recommendCadence, scoreContentInventory } from "./cadence";
export { detectChannels, buildPlatformAdaptations } from "./platform-mapping";
