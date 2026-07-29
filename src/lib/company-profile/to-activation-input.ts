import type { BrandProfile, SeoSummary } from "@/engine/discovery/brand-profile";
import {
  brandProfileSchema,
  seoSummarySchema,
  socialProfileSchema,
  competitorSchema,
} from "@/engine/discovery/brand-profile";
import type { OfferHint } from "@/engine/discovery/extract-offers";
import type { BrandSignals, FaqEntry } from "@/engine/discovery/types";

import type { CompanyProfileProjection } from "./projection.schema";

export type ActivationInput = {
  brandProfile: BrandProfile;
  signals: BrandSignals;
  faqs: FaqEntry[];
  offerHints: OfferHint[];
};

function parseSeo(projection: CompanyProfileProjection): SeoSummary {
  const parsed = seoSummarySchema.safeParse({
    metadataCompleteness: projection.seo?.metadataCompleteness ?? "weak",
    pageSpeedNote: projection.seo?.pageSpeedNote ?? "",
    technicalObservations: projection.seo?.technicalObservations ?? [],
    contentOpportunities: projection.contentOpportunities,
  });
  return parsed.success
    ? parsed.data
    : {
        metadataCompleteness: "weak",
        pageSpeedNote: "",
        technicalObservations: [],
        contentOpportunities: projection.contentOpportunities,
      };
}

/**
 * Projection → a live-crawl-shaped ActivationInput bundle.
 *
 * Prefer `buildDiscoveryNarrative({ projection })` for the discovery card —
 * it keeps full evidence metadata. This helper remains for callers that only
 * need a BrandProfile / FAQ / offerHints view of the same artifact
 * (e.g. load-company-brand).
 */
export function projectionToActivationInput(
  projection: CompanyProfileProjection
): ActivationInput {
  const socialProfiles = projection.socialProfiles.flatMap((s) => {
    const parsed = socialProfileSchema.safeParse(s);
    return parsed.success ? [parsed.data] : [];
  });
  const competitors = projection.competitors.flatMap((c) => {
    const parsed = competitorSchema.safeParse(c);
    return parsed.success ? [parsed.data] : [];
  });

  const brandProfile = brandProfileSchema.parse({
    businessName: projection.businessName,
    website: projection.website,
    description: projection.description?.value ?? "",
    audience: projection.audience?.value ?? "",
    products: projection.products,
    services: projection.services,
    indexedProducts: projection.indexedProducts.flatMap((p) =>
      p.sourceUrl ? [{ ...p, sourceUrl: p.sourceUrl }] : []
    ),
    valueProposition: projection.valueProposition?.value ?? "",
    brandVoice: projection.brandVoice?.value ?? "",
    marketingOpportunity: projection.marketingOpportunity?.value ?? "",
    colors: projection.colors,
    socialProfiles,
    seoSummary: parseSeo(projection),
    competitors,
    derivedFieldNames: projection.derivedFieldNames,
  } satisfies Record<string, unknown>);

  const faqs: FaqEntry[] = projection.faqs.map((f) => ({
    question: f.question,
    answer: f.answer,
    sourceUrl: f.sourceUrl,
  }));

  const signals: BrandSignals = {
    title: projection.signals.title,
    metaDescription: projection.signals.metaDescription,
    headings: projection.signals.headings,
    ctaTexts: projection.signals.ctaTexts,
    productText: projection.signals.productText,
    aboutText: projection.signals.aboutText,
    bodySample: projection.signals.bodySample,
    testimonialText: projection.signals.testimonialText,
    colors: projection.signals.colors,
    contactEmails: projection.signals.contactEmails,
    contactPhones: projection.signals.contactPhones,
    logoUrl: projection.signals.logoUrl,
    locationHints: projection.signals.locationHints,
    faqs,
    organization: projection.signals.organization ?? null,
  } as BrandSignals;

  const offerHints: OfferHint[] = projection.offers.map((o) => ({
    label: o.label,
    sourceUrl: o.sourceUrl,
  }));

  return { brandProfile, signals, faqs, offerHints };
}
