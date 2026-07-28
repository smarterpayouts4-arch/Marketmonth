import type { BrandProfileView } from "@/components/discovery/types";

export function normalizeProfile(raw: BrandProfileView): BrandProfileView {
  return {
    ...raw,
    marketingOpportunity:
      raw.marketingOpportunity ||
      "Build authority with educational content and clear offers.",
    products: raw.products ?? [],
    services: raw.services ?? [],
    competitors: raw.competitors ?? [],
    socialProfiles: raw.socialProfiles ?? [],
    colors: raw.colors ?? [],
    seoSummary: raw.seoSummary ?? {
      metadataCompleteness: "partial",
      pageSpeedNote: "",
      technicalObservations: [],
      contentOpportunities: [],
    },
  };
}
