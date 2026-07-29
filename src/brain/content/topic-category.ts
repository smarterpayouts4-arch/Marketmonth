/**
 * The four marketing jobs a topic can do.
 *
 * Replaces the five-value MarketingFocus objective list. These are *jobs*, not
 * funnel stages: each one names what the reader gets, which is what makes the
 * set industry-agnostic. A plumber, a dental practice, and a supplement search
 * engine all have customer questions, things to teach, proof to show, and terms
 * of sale — even when they share no vocabulary.
 *
 * Awareness is deliberately absent. Awareness content cannot be grounded in a
 * company's own CSV without inventing claims, so it is out of scope here.
 */

export const TOPIC_CATEGORY_IDS = [
  "customer_questions",
  "product_education",
  "trust_proof",
  "offers_conversion",
] as const;

export type TopicCategoryId = (typeof TOPIC_CATEGORY_IDS)[number];

export type TopicCategoryDefinition = {
  id: TopicCategoryId;
  /** Chip label. */
  label: string;
  /** One line shown under the chip. */
  hint: string;
  /**
   * What the topic must accomplish. Goes into the model prompt verbatim, so it
   * is written as an instruction rather than a description.
   */
  purpose: string;
  /**
   * Evidence fields this category prefers, most useful first. Selection falls
   * back to general evidence when none are present rather than failing.
   */
  preferredFields: readonly string[];
};

export const TOPIC_CATEGORY_DEFINITIONS: Record<
  TopicCategoryId,
  TopicCategoryDefinition
> = {
  customer_questions: {
    id: "customer_questions",
    label: "Customer Questions",
    hint: "Answer what people actually ask before they buy.",
    purpose:
      "Answer a real question a prospective customer asks, using this company's own published answer as the basis. Resolve uncertainty rather than promoting.",
    preferredFields: [
      "faq",
      "customerProblem",
      "audience",
      "websiteFaq",
      "description",
    ],
  },
  product_education: {
    id: "product_education",
    label: "Product Education",
    hint: "Teach the category, not the feature list.",
    purpose:
      "Teach the reader something about what this company sells or the category it operates in, so they can judge options for themselves. Explain terms and tradeoffs; never tutorialize the company's own interface.",
    preferredFields: [
      "productsServices",
      "indexedProduct",
      "catalogProduct",
      "educationalTopics",
      "knowsAbout",
      "ownedTopics",
    ],
  },
  trust_proof: {
    id: "trust_proof",
    label: "Trust & Proof",
    hint: "Show the receipts behind the claims.",
    purpose:
      "Show why this company can be believed, using something verifiable it has already published — credentials, method, transparency, or a named source. Demonstrate rather than assert.",
    preferredFields: [
      "websiteTestimonial",
      "certification",
      "credential",
      "aboutText",
      "organizationDescription",
      "trustSignal",
    ],
  },
  offers_conversion: {
    id: "offers_conversion",
    label: "Offers & Conversion",
    hint: "Make the terms of doing business clear.",
    purpose:
      "Make the terms of doing business with this company legible — what it costs, what is included, what risk the buyer carries, and how to proceed. Only state terms the company has actually published.",
    preferredFields: [
      "websiteCta",
      "offer",
      "valueProposition",
      "marketingOpportunity",
      "pricing",
    ],
  },
};

export const TOPIC_CATEGORY_LABELS: Record<TopicCategoryId, string> =
  Object.fromEntries(
    TOPIC_CATEGORY_IDS.map((id) => [id, TOPIC_CATEGORY_DEFINITIONS[id].label])
  ) as Record<TopicCategoryId, string>;

export const TOPIC_CATEGORY_HINTS: Record<TopicCategoryId, string> =
  Object.fromEntries(
    TOPIC_CATEGORY_IDS.map((id) => [id, TOPIC_CATEGORY_DEFINITIONS[id].hint])
  ) as Record<TopicCategoryId, string>;

/** All four are shown; there is no compact subset. */
export const DEFAULT_TOPIC_CATEGORY_OPTIONS: readonly TopicCategoryId[] =
  TOPIC_CATEGORY_IDS;

/**
 * Retired MarketingFocus values, mapped to their closest category.
 *
 * Kept so stored runs and in-flight requests keep resolving instead of erroring.
 * `brand_awareness` and `value_proposition` have no direct successor: awareness
 * left the product, and value proposition is a conversion argument, so both land
 * on offers_conversion.
 */
const LEGACY_FOCUS_TO_CATEGORY: Record<string, TopicCategoryId> = {
  brand_awareness: "offers_conversion",
  value_proposition: "offers_conversion",
  product_education: "product_education",
  decision_support: "customer_questions",
  trust_authority: "trust_proof",
};

export function isTopicCategoryId(raw: unknown): raw is TopicCategoryId {
  return (
    typeof raw === "string" &&
    (TOPIC_CATEGORY_IDS as readonly string[]).includes(raw)
  );
}

/**
 * Parse a category id, tolerating retired MarketingFocus values.
 *
 * Absent input is valid: the caller decides the default, because Auto-generate
 * and an explicit chip press are different intents.
 */
export function parseTopicCategory(
  raw: unknown
):
  | { ok: true; value: TopicCategoryId | undefined; migratedFrom?: string }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  if (typeof raw !== "string") {
    return { ok: false, error: "topicCategory must be a string" };
  }
  if (isTopicCategoryId(raw)) return { ok: true, value: raw };

  const migrated = LEGACY_FOCUS_TO_CATEGORY[raw];
  if (migrated) return { ok: true, value: migrated, migratedFrom: raw };

  return {
    ok: false,
    error: `topicCategory must be one of: ${TOPIC_CATEGORY_IDS.join(", ")}`,
  };
}

export function topicCategoryPurposeLine(id: TopicCategoryId): string {
  return TOPIC_CATEGORY_DEFINITIONS[id].purpose;
}

export function preferredFieldsForCategory(
  id: TopicCategoryId
): readonly string[] {
  return TOPIC_CATEGORY_DEFINITIONS[id].preferredFields;
}
