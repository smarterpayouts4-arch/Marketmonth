import type { BrandProfile } from "@/engine/discovery/brand-profile";
import type { OfferHint } from "@/engine/discovery/extract-offers";
import type { BrandSignals, FaqEntry } from "@/engine/discovery/types";
import type { CompanyProfileProjection } from "@/lib/company-profile/projection.schema";
import { companyProfileProjectionSchema } from "@/lib/company-profile/projection.schema";

/**
 * Build a minimal projection from a live crawl ActivationInput-shaped bundle
 * when no CSV artifact exists yet.
 */
export function activationInputToProjection(input: {
  brandProfile: BrandProfile;
  signals?: BrandSignals | null;
  faqs?: FaqEntry[];
  offerHints?: OfferHint[];
}): CompanyProfileProjection {
  const profile = input.brandProfile;
  const signals = input.signals;
  const faqs = input.faqs ?? signals?.faqs ?? [];
  let companyId = "";
  try {
    companyId = new URL(profile.website).hostname.replace(/^www\./, "");
  } catch {
    companyId = profile.website;
  }

  return companyProfileProjectionSchema.parse({
    companyId: companyId || "unknown",
    schemaVersion: "2.0",
    website: profile.website,
    businessName: profile.businessName || "This business",
    description: profile.description
      ? {
          value: profile.description,
          evidenceType: "inferred",
          provenance: "inferred",
        }
      : undefined,
    audience: profile.audience
      ? {
          value: profile.audience,
          evidenceType: "inferred",
          provenance: "inferred",
        }
      : undefined,
    valueProposition: profile.valueProposition
      ? {
          value: profile.valueProposition,
          evidenceType: "inferred",
          provenance: "inferred",
        }
      : undefined,
    brandVoice: profile.brandVoice
      ? {
          value: profile.brandVoice,
          evidenceType: "inferred",
          provenance: "inferred",
        }
      : undefined,
    marketingOpportunity: profile.marketingOpportunity
      ? {
          value: profile.marketingOpportunity,
          evidenceType: "recommended",
          provenance: "recommended",
        }
      : undefined,
    products: profile.products,
    services: profile.services,
    indexedProducts: profile.indexedProducts ?? [],
    colors: profile.colors,
    socialProfiles: profile.socialProfiles,
    competitors: profile.competitors,
    contentOpportunities: profile.seoSummary?.contentOpportunities ?? [],
    seo: profile.seoSummary
      ? {
          metadataCompleteness: profile.seoSummary.metadataCompleteness,
          pageSpeedNote: profile.seoSummary.pageSpeedNote,
          technicalObservations: profile.seoSummary.technicalObservations,
        }
      : undefined,
    signals: {
      title: signals?.title ?? "",
      metaDescription: signals?.metaDescription ?? "",
      headings: signals?.headings ?? [],
      ctaTexts: signals?.ctaTexts ?? [],
      productText: signals?.productText ?? "",
      aboutText: signals?.aboutText ?? "",
      bodySample: signals?.bodySample ?? "",
      testimonialText: signals?.testimonialText ?? "",
      colors: signals?.colors ?? [],
      contactEmails: signals?.contactEmails ?? [],
      contactPhones: signals?.contactPhones ?? [],
      logoUrl: signals?.logoUrl,
      locationHints: signals?.locationHints ?? [],
      organization: signals?.organization ?? null,
    },
    faqs: faqs.map((f) => ({
      question: f.question,
      answer: f.answer,
      sourceUrl: f.sourceUrl,
    })),
    offers: (input.offerHints ?? []).map((o) =>
      typeof o === "string"
        ? { label: o }
        : { label: o.label, sourceUrl: o.sourceUrl }
    ),
    evidence: [],
    derivedFieldNames: profile.derivedFieldNames ?? [],
  });
}
