import type { BrandProfile } from "../brand-profile";
import type { ProfileArgs } from "./types";

export function fallbackProfile(args: ProfileArgs): BrandProfile {
  const name = args.signals.title.split(/[|\-–]/)[0]?.trim() || "Business";
  const products = args.signals.headings
    .filter((h) => h.length < 60)
    .slice(0, 5);
  const offers = [...products, ...args.competitorHints.productKeywords].slice(
    0,
    4
  );

  return {
    businessName: name,
    website: args.website,
    description:
      args.signals.metaDescription ||
      args.signals.aboutText.slice(0, 280) ||
      `${name} website overview from public pages.`,
    audience: "Customers researching solutions in this category",
    products: offers.length ? offers : ["Core offerings"],
    services: [],
    catalogProducts: args.signals.catalogProducts.map((p) => ({
      name: p.name,
      price: p.price,
      sourceUrl: p.sourceUrl,
    })),
    valueProposition:
      args.signals.metaDescription ||
      "Help customers understand offerings and take the next step.",
    brandVoice: "Clear · Helpful · Professional",
    marketingOpportunity:
      "Build authority with educational content, clear offers, and consistent organic presence.",
    colors: args.signals.colors,
    socialProfiles: args.social,
    seoSummary: args.seo,
    competitors: args.competitorHints.categoryKeywords.slice(0, 3).map((k) => ({
      name: `${k} category peers`,
      reason: "Suggested from on-site language — not verified SEO competitors.",
    })),
  };
}
