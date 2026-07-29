/**
 * Engine stream event types. Stage catalog lives in @/lib/discovery/stages
 * so UI can share constants without importing engine internals.
 */
export {
  DISCOVERY_STAGES,
  type DiscoveryStageId,
  type StageStatus,
  type StageEvent,
} from "@/lib/discovery/stages";

import type { StageEvent } from "@/lib/discovery/stages";

export type ResultEvent = {
  type: "result";
  brandProfile: import("./brand-profile").BrandProfile;
  marketingOpportunity: string;
  analysisId: string;
  brandProfileId: string;
  cached: boolean;
  pageCount?: number;
  detectedLocations?: import("@/lib/discovery/location.schema").DetectedLocation[];
  /** Grounded 3-section social discovery narrative — UI formats only. */
  discoveryNarrative: import("@/lib/discovery/discovery-narrative.schema").SocialDiscoveryProfile;
};

export type ErrorEvent = {
  type: "error";
  message: string;
};

export type DiscoveryStreamEvent = StageEvent | ResultEvent | ErrorEvent;
