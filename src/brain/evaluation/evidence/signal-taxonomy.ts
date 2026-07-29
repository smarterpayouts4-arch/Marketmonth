/**
 * Deterministic signal taxonomy for CSV-grounded evidence.
 * Maps field names / record types to stable signal buckets.
 */

export type TopicEvidenceSignalType =
  | "faq"
  | "product"
  | "indexed_product"
  | "catalog_product"
  | "commercial_term"
  | "cta"
  | "heading"
  | "testimonial"
  | "certification"
  | "about"
  | "audience"
  | "customer_problem"
  | "value_proposition"
  | "offer"
  | "pricing"
  | "marketing_opportunity"
  | "educational_topic"
  | "trust_signal"
  | "brand_identity"
  | "content_opportunity"
  | "website_signal"
  | "social_profile"
  | "unknown";

/** Exact field aliases — most specific wins when iterating. */
const FIELD_ALIAS: Record<string, TopicEvidenceSignalType> = {
  faq: "faq",
  websiteFaq: "faq",
  entry: "faq",
  productsServices: "product",
  products: "product",
  services: "product",
  product: "product",
  indexedProduct: "indexed_product",
  indexedProducts: "indexed_product",
  catalogProduct: "catalog_product",
  websiteCta: "cta",
  cta: "cta",
  websiteTestimonial: "testimonial",
  testimonialText: "testimonial",
  certification: "certification",
  credential: "certification",
  aboutText: "about",
  organizationDescription: "about",
  audience: "audience",
  customerProblem: "customer_problem",
  valueProposition: "value_proposition",
  offer: "offer",
  hint: "offer",
  pricing: "pricing",
  marketingOpportunity: "marketing_opportunity",
  educationalTopics: "educational_topic",
  knowsAbout: "educational_topic",
  ownedTopics: "educational_topic",
  trustSignal: "trust_signal",
  businessName: "brand_identity",
  description: "brand_identity",
  brandVoice: "brand_identity",
  title: "website_signal",
  meta_description: "website_signal",
  metaDescription: "website_signal",
  product_text: "product",
  productText: "product",
  body_sample: "website_signal",
  bodySample: "website_signal",
  heading: "heading",
  contentOpportunities: "content_opportunity",
  "seo.contentOpportunities": "content_opportunity",
  socialProfiles: "social_profile",
  competitors: "unknown",
};

const RECORD_TYPE_HINT: Record<string, TopicEvidenceSignalType> = {
  faq: "faq",
  offer: "commercial_term",
  signal: "website_signal",
  brand_profile: "brand_identity",
};

function normalizeFieldKey(field: string): string {
  return field.trim();
}

export function classifyEvidenceSignalType(input: {
  field: string;
  recordType?: string;
}): TopicEvidenceSignalType {
  const field = normalizeFieldKey(input.field);
  const direct = FIELD_ALIAS[field];
  if (direct) return direct;

  const lower = field.toLowerCase();
  for (const [alias, signal] of Object.entries(FIELD_ALIAS)) {
    if (alias.toLowerCase() === lower) return signal;
  }

  if (/faq/i.test(field)) return "faq";
  if (/testimonial/i.test(field)) return "testimonial";
  if (/certif|credential|trust/i.test(field)) return "trust_signal";
  if (/cta|call.?to.?action/i.test(field)) return "cta";
  if (/pricing|price/i.test(field)) return "pricing";
  if (/product|catalog|indexed/i.test(field)) return "product";
  if (/audience|customer/i.test(field)) return "audience";
  if (/offer|commercial/i.test(field)) return "commercial_term";

  if (input.recordType) {
    const fromRecord = RECORD_TYPE_HINT[input.recordType];
    if (fromRecord) return fromRecord;
  }

  return "unknown";
}

export function isCommercialTermSignal(
  signalType: TopicEvidenceSignalType
): boolean {
  return signalType === "commercial_term";
}

export function isProofQualitySignal(
  signalType: TopicEvidenceSignalType
): boolean {
  return !["content_opportunity", "unknown"].includes(signalType);
}
