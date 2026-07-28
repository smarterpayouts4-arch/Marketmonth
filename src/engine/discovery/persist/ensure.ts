import type { BrandProfile } from "../brand-profile";

export function ensureMarketingOpportunity(profile: BrandProfile): BrandProfile {
  if (profile.marketingOpportunity?.trim()) return profile;
  return {
    ...profile,
    marketingOpportunity:
      "Build authority with educational content, clear offers, and consistent organic presence.",
  };
}
