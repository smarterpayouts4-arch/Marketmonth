/**
 * UI-safe discovery stage catalog (shared domain contract).
 * Presentation and engine both import from here — UI must never import @/engine.
 */
export const DISCOVERY_STAGES = [
  { id: "crawling", label: "Crawling website" },
  { id: "understanding_audience", label: "Reading site content" },
  { id: "finding_offers", label: "Finding offers" },
  { id: "reviewing_social", label: "Checking SEO, social & competitors" },
  { id: "building_profile", label: "Building brand profile & discoveries" },
] as const;

export type DiscoveryStageId = (typeof DISCOVERY_STAGES)[number]["id"];

export type StageStatus = "pending" | "active" | "complete" | "error";

export type StageEvent = {
  type: "stage";
  id: DiscoveryStageId;
  status: StageStatus;
  label: string;
};
