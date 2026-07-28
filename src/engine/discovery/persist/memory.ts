import type { DiscoveryActivationProfile } from "@/lib/discovery/activation-profile";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import type { DetectedLocation } from "@/lib/discovery/location.schema";

import type { BrandProfile, StrategyPreview } from "../brand-profile";
import type {
  PersistedAnalysis,
  PersistedDiscovery,
  PersistedStrategy,
} from "./types";

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
  activationProfile?: DiscoveryActivationProfile;
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
    activationProfile: input.activationProfile,
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

export function memoryPersist(input: {
  brandProfile: BrandProfile;
  strategyPreview: StrategyPreview;
}): PersistedDiscovery {
  const analysis = memoryPersistAnalysis(input);
  const strategy = memoryPersistStrategy(input);
  return { ...analysis, ...strategy };
}
