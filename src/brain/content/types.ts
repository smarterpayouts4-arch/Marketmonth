/**
 * Content Brain contracts — brand-agnostic.
 * Dashboard and API consume these types; they must not redefine Brain logic.
 */

import type { TopicCategoryId } from "./topic-category";

export type { TopicCategoryId } from "./topic-category";

export type Confidence = "high" | "medium" | "low";

export type ContentAngle =
  | "beginner_guide"
  | "faq"
  | "problem_solution"
  | "decision_guide"
  | "comparison"
  | "trust_transparency"
  | "how_it_works"
  | "action_oriented"
  | "other";

export type SafetyStatus = "safe" | "needs_review" | "blocked";

export type SafetyFlags = {
  status: SafetyStatus;
  reasons: string[];
};

export type MasterTopic = {
  id: string;
  source: "automatic" | "manual";
  /** Umbrella subject shared by all six directions */
  punchline: string;
  subheading: string;
  rationale: string;
  evidenceIds: string[];
  confidence: Confidence;
  safety: SafetyFlags;
};

export type ContentVariation = {
  id: string;
  angle: ContentAngle;
  /** Working headline for this direction — not a second master topic */
  punchline: string;
  subheading: string;
  brief: string;
  /**
   * Card body: 180–600 chars explaining how the idea works.
   * Preferred for UI + evaluation history.
   */
  ideaSummary?: string;
  audienceProblem?: string;
  strategicPurpose: string;
  /** Concrete cell: specific opportunity topic (preferred over punchline alone) */
  specificTopic?: string;
  /** Concrete cell: what the audience gets if they engage */
  corePromise?: string;
  /** Format hint — never a channel name */
  suggestedFormat?: string;
  suggestedCta?: string;
  destination?: string;
  evidenceIds: string[];
  claimIds?: string[];
  audienceProblemIds?: string[];
  differentiationSummary?: string;
  assumptionIds: string[];
  confidence: Confidence;
  safety: SafetyFlags;
};

/** Alias — concrete opportunity cell selected at Gate 1 */
export type ContentDirectionCell = ContentVariation;

export type ContentDirectionResult =
  | {
      status: "ready" | "partially_ready";
      brandName: string;
      generatedAt: string;
      contextVersion: string;
      /** Canonical generation identity (topic history + Studio handoff). */
      generationId: string;
      mode: "automatic" | "manual";
      masterTopic: MasterTopic;
      variations: [
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
        ContentVariation,
      ];
      warnings: string[];
    }
  | {
      status: "blocked";
      brandName: string;
      mode: "automatic" | "manual";
      missingFields: string[];
      warnings: string[];
      variations: [];
    };

export type OwnerConfirmedContext = {
  text: string;
  source: "pasted" | "uploaded_file" | "combined";
  filenames: string[];
};

/** Indexed/compared third-party product — distinct from platform products[]. */
export type ContentIndexedProduct = {
  name: string;
  price?: string;
  sourceUrl?: string;
};

/** FAQ pair from approved profile — primary fuel for customer_questions. */
export type ContentFaq = {
  question: string;
  answer: string;
  sourceUrl?: string;
};

/**
 * Commercial term of sale (offer-as-relation), never a product/catalog name.
 * Populated from projection.offers after the extract-offers precision fix.
 */
export type ContentCommercialTerm = {
  label: string;
  sourceUrl?: string;
};

/**
 * Curated crawl signals minus PII-bearing fields.
 * Contact arrays, location, colors, logo, and organization are dropped upstream.
 */
export type ContentBrandSignals = {
  headings: string[];
  ctaTexts: string[];
  productText: string;
  aboutText: string;
  bodySample: string;
  testimonialText: string;
};

export type ContentBrainContext = {
  brandName: string;
  domain: string;
  website: string;
  description?: string;
  audience?: string;
  /** Platform capabilities / offer positioning — not indexed third-party products. */
  products: string[];
  services: string[];
  /**
   * First-class indexed products. Never merge FAQ/capabilities into this list
   * via products[] heuristics — only typed indexedProduct evidence.
   */
  indexedProducts: ContentIndexedProduct[];
  valueProposition?: string;
  brandVoice?: string;
  marketingOpportunity?: string;
  contentOpportunities: string[];
  /** FAQ pairs (question/answer split) for customer_questions grounding. */
  faqs?: ContentFaq[];
  /** Commercial terms of sale — empty is a valid outcome when none are published. */
  commercialTerms?: ContentCommercialTerm[];
  /** PII-scrubbed crawl signals for category evidence selection. */
  signals?: ContentBrandSignals;
  /** Deterministic evidence ids keyed for citation */
  evidenceById: Record<string, ContentEvidence>;
  contextVersion: string;
  source: "fixture" | "live";
  /**
   * Owner-supplied notes/files for this generation.
   * Not observed website evidence — never given evidence IDs.
   */
  ownerConfirmed?: OwnerConfirmedContext;
};

export type ContentEvidence = {
  id: string;
  recordType: string;
  field: string;
  value: string;
  sourceUrl: string;
  sourceSnippet: string;
  confidence: Confidence;
  /** CSV evidence_type — e.g. industry_research vs observed */
  evidenceType?: string;
  notes?: string;
};

export type ExtraContextInput = {
  text: string;
  source: "pasted" | "uploaded_file" | "combined";
  filenames?: string[];
};

export type GenerateContentDirectionsInput = {
  context: ContentBrainContext;
  mode: "automatic" | "manual";
  topic?: string;
  /**
   * User-confirmed strategic purpose for this topic set.
   * Not observed website evidence — never invents evidence IDs.
   */
  topicCategory?: TopicCategoryId;
  /** Structured owner goals only — not paste/upload body text */
  priorities?: string[];
  /** Supplemental paste/upload context (owner-confirmed) */
  extraContext?: ExtraContextInput;
  requestedVariations?: number;
  /**
   * When regenerating ideas under an existing master topic, pass the locked
   * punchline. Brain must not invent a different master.
   */
  lockedMasterTopic?: string;
  /** Compact recent master topics for Auto-generate novelty (not Brand Core). */
  recentMasterTopics?: string[];
  /** Optional salt so regenerate/new runs get distinct generationIds. */
  requestSalt?: string;
  /** Product default is deterministic-v1. */
  directionsProvider?: "deterministic-v1" | "intelligent-v1";
  /**
   * Structured selected-topic handoff (Idea Lab / future product).
   * When set, master punchline is preserved byte-for-byte from masterTitle.
   */
  selectedTopicContext?: import("./direction-writing-context").SelectedTopicContext;
  /**
   * Hook polish after deterministic directions (separate version).
   * auto → OPENAI only when HOOK_ENRICHMENT_PROVIDER=openai.
   */
  hookEnrichmentProvider?: "deterministic-v1" | "openai" | "auto";
};

export type ContentDirectionsHandoffV1 = {
  version: 1;
  /** Canonical generation identity — sole handoff key. */
  generationId: string;
  contextVersion: string;
  brand: { name: string; domain: string };
  mode: "automatic" | "manual";
  masterTopic: MasterTopic;
  variations: [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];
  selectedVariationId: string;
  selectedAt: string;
  /** User-confirmed strategic purpose from Marketing Topic (optional). */
  topicCategory?: string;
  /** Short summary of owner supplemental context — not full paste body. */
  extraContextSummary?: string;
};

export const PUNCHLINE_MAX = 90;
export const SUBHEADING_MAX = 150;
export const BRIEF_MAX = 280;
export const REQUIRED_VARIATION_COUNT = 6;
