import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import type { DetectedLocation } from "@/lib/discovery/location.schema";

import type { BrandProfile, StrategyPreview } from "../brand-profile";
import type { PersistedAnalysis, PersistedStrategy } from "./types";

const memoryEvidence = new Map<
  string,
  {
    evidence: DiscoveryEvidence[];
    pageCount: number;
    detectedLocations: DetectedLocation[];
  }
>();

export function memoryPersistAnalysis(input: {
  brandProfile: BrandProfile;
  evidence?: DiscoveryEvidence[];
  pageCount?: number;
  detectedLocations?: DetectedLocation[];
  discoveryNarrative?: SocialDiscoveryProfile;
}): PersistedAnalysis {
  const id = crypto.randomUUID();
  memoryEvidence.set(id, {
    evidence: input.evidence ?? [],
    pageCount: input.pageCount ?? 0,
    detectedLocations: input.detectedLocations ?? [],
  });
  return {
    analysisId: id,
    brandProfileId: id,
    brandProfile: input.brandProfile,
    evidence: input.evidence ?? [],
    pageCount: input.pageCount ?? 0,
    detectedLocations: input.detectedLocations ?? [],
    discoveryNarrative: input.discoveryNarrative,
    cached: false,
  };
}

export function memoryGetEvidence(brandProfileId: string): {
  evidence: DiscoveryEvidence[];
  pageCount: number;
  detectedLocations: DetectedLocation[];
} | null {
  return memoryEvidence.get(brandProfileId) ?? null;
}

export function memoryPersistStrategy(input: {
  strategyPreview: StrategyPreview;
}): PersistedStrategy {
  return {
    strategyPreviewId: crypto.randomUUID(),
    strategyPreview: input.strategyPreview,
  };
}
