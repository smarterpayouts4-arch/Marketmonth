import type { ContentVariation } from "@/brain/content/types";
import type {
  IdeaCandidateView,
  InfluenceItem,
} from "@/brain/evaluation/idea-lab.types";

export function toIdeaView(v: ContentVariation): IdeaCandidateView {
  return {
    id: v.id,
    angle: v.angle,
    punchline: v.punchline,
    subheading: v.subheading,
    brief: v.brief,
    ideaSummary: v.ideaSummary,
    audienceProblem: v.audienceProblem,
    strategicPurpose: v.strategicPurpose,
    specificTopic: v.specificTopic,
    corePromise: v.corePromise,
    suggestedFormat: v.suggestedFormat,
    suggestedCta: v.suggestedCta,
    evidenceIds: v.evidenceIds,
    assumptionIds: v.assumptionIds,
    confidence: v.confidence,
    safetyStatus: v.safety.status,
    safetyReasons: v.safety.reasons,
  };
}

export function buildInfluence(args: {
  brandName: string;
  website?: string;
  products: string[];
  services: string[];
  audience?: string;
  positioning?: string;
  offers: string[];
  contentOpportunities: string[];
  proofCount: number;
  evidenceCount: number;
}): InfluenceItem[] {
  return [
    {
      key: "businessName",
      value: args.brandName,
      origin: "csv_brand_profile",
    },
    {
      key: "website",
      value: args.website ?? null,
      origin: "csv_brand_profile",
    },
    {
      key: "products",
      value: args.products,
      origin: "csv_brand_profile",
      note: "Passed via ContentBrainContext into deterministic templates",
    },
    {
      key: "services",
      value: args.services,
      origin: "csv_brand_profile",
    },
    {
      key: "audience",
      value: args.audience ?? null,
      origin: "csv_brand_profile",
    },
    {
      key: "contentOpportunities",
      value: args.contentOpportunities,
      origin: "csv_brand_profile",
      note: "Used by automatic master topic templates when present",
    },
    {
      key: "positioning",
      value: args.positioning ?? null,
      origin: "brand_core_compiled_not_consumed",
      note: "Brand Core compiled for identity; not primary idea-generation input for deterministic-v1",
    },
    {
      key: "offers",
      value: args.offers,
      origin: "brand_core_compiled_not_consumed",
    },
    {
      key: "proof_library_count",
      value: args.proofCount,
      origin: "brand_core_compiled_not_consumed",
    },
    {
      key: "evidenceCount",
      value: args.evidenceCount,
      origin: "csv_brand_profile",
      note: "Evidence IDs attached from context.evidenceById keys (not Brand Core claims)",
    },
    {
      key: "master_topic_rationale_from_generator",
      value: null,
      origin: "not_available",
      note: "Rationale not currently exposed by generator.",
    },
  ];
}
