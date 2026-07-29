import type { BrandSignalGraph, EvidenceItem, SignalCategory } from "./types";

/**
 * Industry-agnostic field → category mapping.
 * No vertical-specific keywords — classification is by structured field name.
 */
const FIELD_CATEGORY: Record<string, SignalCategory> = {
  businessName: "businessIdentity",
  organizationDescription: "businessIdentity",
  description: "businessIdentity",
  serviceArea: "businessIdentity",
  knowsAbout: "businessIdentity",
  title: "businessIdentity",
  meta_description: "businessIdentity",
  about_text: "businessIdentity",

  audience: "customerProblem",
  positioning: "customerProblem",
  customerProblems: "customerProblem",
  websiteTestimonial: "customerProblem",
  testimonialText: "customerProblem",

  valueProposition: "valueMechanism",
  products: "valueMechanism",
  services: "valueMechanism",
  product_text: "valueMechanism",
  heading: "valueMechanism",
  indexedProducts: "valueMechanism",
  indexedProduct: "valueMechanism",
  productsServices: "valueMechanism",

  brandVoice: "trustSignals",
  // faq / entry classified by heuristics below (trust vs value vs content)

  hint: "offerInventory",
  websiteCta: "conversionPaths",
  cta: "conversionPaths",

  educationalTopics: "contentInventory",
  ownedTopics: "contentInventory",
  "seo.contentOpportunities": "contentInventory",
  marketingOpportunity: "contentInventory",
  body_sample: "contentInventory",

  socialProfiles: "socialFootprint",
  "social.facebook": "socialFootprint",
  "social.linkedin": "socialFootprint",
  "social.youtube": "socialFootprint",
  "social.instagram": "socialFootprint",
  "social.tiktok": "socialFootprint",
  "social.x": "socialFootprint",
  organization_same_as: "socialFootprint",
};

function classifyField(field: string, item: EvidenceItem): SignalCategory | null {
  if (FIELD_CATEGORY[field]) return FIELD_CATEGORY[field];

  if (field.startsWith("social.")) return "socialFootprint";
  if (field.startsWith("seo.") && field !== "seo.contentOpportunities") {
    // Technical SEO is intentionally excluded from the social narrative
    return null;
  }

  // FAQ entries about trust / independence / sources → trust
  if (
    (field === "faq" || field === "entry") &&
    item.normalizedText &&
    /\b(trust|independent|sponsor|affiliate|source|evidence|medical advice|transparency)\b/i.test(
      item.normalizedText
    )
  ) {
    return "trustSignals";
  }

  // How-it-works FAQ → value mechanism
  if (
    (field === "faq" || field === "entry") &&
    item.normalizedText &&
    /\b(how (does|do|to)|work|advisor|plan|compare|search)\b/i.test(
      item.normalizedText
    )
  ) {
    return "valueMechanism";
  }

  // Remaining FAQ → content inventory (questions customers ask)
  if (field === "faq" || field === "entry") return "contentInventory";

  // Offer / tool inventory from product-like labels
  if (
    item.recordType === "offer" ||
    (item.normalizedText &&
      /\b(tool|advisor|builder|search|compare|plan)\b/i.test(item.normalizedText) &&
      item.recordType !== "signal")
  ) {
    if (item.recordType === "offer") return "offerInventory";
  }

  return null;
}

const EMPTY_GRAPH = (): BrandSignalGraph => ({
  businessIdentity: [],
  customerProblem: [],
  valueMechanism: [],
  trustSignals: [],
  offerInventory: [],
  contentInventory: [],
  socialFootprint: [],
  conversionPaths: [],
});

/** Organize normalized evidence into the brand signal graph. */
export function buildBrandSignalGraph(items: EvidenceItem[]): BrandSignalGraph {
  const graph = EMPTY_GRAPH();
  for (const item of items) {
    const category = classifyField(item.field, item);
    if (!category) continue;
    graph[category].push(item);
  }
  return graph;
}

export function graphCounts(graph: BrandSignalGraph): Record<SignalCategory, number> {
  return {
    businessIdentity: graph.businessIdentity.length,
    customerProblem: graph.customerProblem.length,
    valueMechanism: graph.valueMechanism.length,
    trustSignals: graph.trustSignals.length,
    offerInventory: graph.offerInventory.length,
    contentInventory: graph.contentInventory.length,
    socialFootprint: graph.socialFootprint.length,
    conversionPaths: graph.conversionPaths.length,
  };
}
