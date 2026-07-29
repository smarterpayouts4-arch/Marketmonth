import type { DiscoveryEvidence } from "@/lib/discovery/evidence.schema";

import type { BrandProfile } from "../brand-profile";

/**
 * Normalize persisted BrandProfile JSON (legacy catalogProducts → indexedProducts)
 * and ensure marketingOpportunity is present.
 */
export function ensureMarketingOpportunity(profile: BrandProfile): BrandProfile {
  const legacy = profile as BrandProfile & {
    catalogProducts?: BrandProfile["indexedProducts"];
  };
  const indexedProducts =
    legacy.indexedProducts?.length
      ? legacy.indexedProducts
      : legacy.catalogProducts?.length
        ? legacy.catalogProducts
        : [];

  const next: BrandProfile = {
    ...profile,
    indexedProducts,
    marketingOpportunity:
      profile.marketingOpportunity?.trim() ||
      "Build authority with educational content, clear offers, and consistent organic presence.",
  };
  return next;
}

/** Rename legacy evidence field labels for materialize / Brand Core. */
export function normalizeDiscoveryEvidence(
  evidence: DiscoveryEvidence[]
): DiscoveryEvidence[] {
  return evidence.map((e) => {
    if (e.field === "catalogProduct" || e.field === "catalogProducts") {
      return { ...e, field: "indexedProduct" };
    }
    return e;
  });
}
