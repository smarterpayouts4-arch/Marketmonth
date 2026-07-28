import type { DiscoveryActivationProfile } from "@/lib/discovery/activation-profile";
import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";
import type { DetectedLocation } from "@/lib/discovery/location.schema";

import type { BrandProfile, StrategyPreview } from "../brand-profile";

export type PersistedAnalysis = {
  analysisId: string;
  brandProfileId: string;
  brandProfile: BrandProfile;
  evidence?: DiscoveryEvidence[];
  pageCount?: number;
  detectedLocations?: DetectedLocation[];
  /** Grounded activation Hook profile — rebuilt on cache miss if absent. */
  activationProfile?: DiscoveryActivationProfile;
  cached: boolean;
};

export type PersistedStrategy = {
  strategyPreviewId: string;
  strategyPreview: StrategyPreview;
};

/** @deprecated shape kept for callers that still expect strategy */
export type PersistedDiscovery = PersistedAnalysis & {
  strategyPreviewId: string;
  strategyPreview: StrategyPreview;
};
