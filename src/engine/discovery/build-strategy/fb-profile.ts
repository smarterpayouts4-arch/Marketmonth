import { deriveNarrative } from "../build-profile-from-corpus/derive-narrative";
import type { BrandProfile } from "../brand-profile";
import type { ProfileArgs } from "./types";

export function fallbackProfile(args: ProfileArgs): BrandProfile {
  const name = args.signals.title.split(/[|\-–]/)[0]?.trim() || "Business";
  const narrative = deriveNarrative({
    businessName: name,
    signals: args.signals,
  });

  return {
    businessName: name,
    website: args.website,
    description: narrative.description,
    audience: narrative.audience,
    products: [],
    services: narrative.services,
    indexedProducts: args.signals.indexedProducts.map((p) => ({
      name: p.name,
      price: p.price,
      sourceUrl: p.sourceUrl,
    })),
    valueProposition: narrative.valueProposition,
    brandVoice: narrative.brandVoice,
    marketingOpportunity: narrative.marketingOpportunity,
    colors: args.signals.colors,
    socialProfiles: args.social,
    seoSummary: args.seo,
    competitors: args.competitorHints.categoryKeywords.slice(0, 3).map((k) => ({
      name: `${k} category peers`,
      reason: "Suggested from on-site language — not verified SEO competitors.",
    })),
  };
}
