import type { SocialDiscoveryProfile } from "@/lib/discovery/discovery-narrative.schema";
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
  /** Grounded 3-section social discovery narrative — rebuilt on cache miss if absent. */
  discoveryNarrative?: SocialDiscoveryProfile;
  /** Host key both branches use to resolve the company profile artifact. */
  companyId?: string;
  /** Hash of the draft CSV this run materialized. */
  artifactHash?: string;
  cached: boolean;
};

export type PersistedStrategy = {
  strategyPreviewId: string;
  strategyPreview: StrategyPreview;
};
