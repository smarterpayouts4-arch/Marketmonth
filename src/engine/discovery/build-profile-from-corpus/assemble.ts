import type { BrandProfile, SocialProfile } from "../brand-profile";
import type { BrandSignals } from "../types";

import type {
  CuratedCapability,
  DerivedCompanyKnowledge,
  ObservedCompanyKnowledge,
} from "./types";

function brandNameFromWebsite(website: string): string | null {
  try {
    const host = new URL(
      /^https?:\/\//i.test(website) ? website : `https://${website}`
    ).hostname
      .toLowerCase()
      .replace(/^www\./, "");
    const base = host.split(".")[0];
    if (!base || base.length < 2) return null;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return null;
  }
}

function isUsableBusinessName(name: string, website: string): boolean {
  const n = name.trim();
  if (n.length < 2) return false;
  if (/^https?:\/\//i.test(n)) return false;
  if (n === website) return false;
  try {
    const host = new URL(
      /^https?:\/\//i.test(website) ? website : `https://${website}`
    ).hostname.toLowerCase();
    if (n.toLowerCase() === host) return false;
  } catch {
    // ignore
  }
  return true;
}

export function assembleObserved(input: {
  website: string;
  signals: BrandSignals;
  social: SocialProfile[];
}): ObservedCompanyKnowledge {
  const { website, signals, social } = input;
  const orgName = signals.organization?.name?.trim();
  const rawTitle = signals.title.replace(/\s+/g, " ").trim();
  const titleName = rawTitle.split(/[|–]/)[0]?.trim(); // avoid splitting hyphenated SEO titles
  const fromHost = brandNameFromWebsite(website);
  const titleLooksSeo =
    /supplement|search|engine|platform|ai-?powered|compare|price/i.test(
      rawTitle
    );
  const businessName =
    (orgName && isUsableBusinessName(orgName, website) ? orgName : null) ||
    (titleLooksSeo && fromHost ? fromHost : null) ||
    (titleName &&
    titleName.length >= 3 &&
    !titleLooksSeo &&
    isUsableBusinessName(titleName, website)
      ? titleName
      : null) ||
    fromHost ||
    "Business";
  return {
    businessName,
    website,
    indexedProducts: signals.indexedProducts.map((p) => ({
      name: p.name,
      price: p.price,
      sourceUrl: p.sourceUrl,
    })),
    faqs: signals.faqs,
    contactEmails: [...signals.contactEmails],
    contactPhones: [...signals.contactPhones],
    organization: signals.organization ?? null,
    socialProfiles: social.filter((s) => s.status === "present"),
    logoUrl: signals.logoUrl,
  };
}

export function assembleDerived(profile: BrandProfile): DerivedCompanyKnowledge {
  return {
    description: profile.description,
    audience: profile.audience,
    products: [...profile.products],
    services: [...profile.services],
    valueProposition: profile.valueProposition,
    brandVoice: profile.brandVoice,
    marketingOpportunity: profile.marketingOpportunity,
    competitors: profile.competitors,
    seoSummary: profile.seoSummary,
  };
}

export function toCuratedCapabilities(
  names: string[] | undefined
): CuratedCapability[] {
  if (!names?.length) return [];
  return names.map((name) => ({
    name,
    knowledgeClass: "curated_fixture" as const,
  }));
}

/** Merge observed + derived (+ optional curated products) into BrandProfile. */
export function assembleBrandProfile(input: {
  observed: ObservedCompanyKnowledge;
  derived: DerivedCompanyKnowledge;
  curatedCapabilities: CuratedCapability[];
  colors: string[];
  /** Full social list (present + missing) for profile UI. */
  socialAll: SocialProfile[];
}): BrandProfile {
  const { observed, derived, curatedCapabilities, colors, socialAll } = input;
  return {
    businessName: observed.businessName,
    website: observed.website,
    description: derived.description,
    audience: derived.audience,
    products: curatedCapabilities.length
      ? curatedCapabilities.map((c) => c.name)
      : derived.products,
    services: derived.services,
    indexedProducts: observed.indexedProducts,
    valueProposition: derived.valueProposition,
    brandVoice: derived.brandVoice,
    marketingOpportunity: derived.marketingOpportunity,
    colors,
    socialProfiles: socialAll.length ? socialAll : observed.socialProfiles,
    seoSummary: { ...derived.seoSummary },
    competitors: derived.competitors,
  };
}
