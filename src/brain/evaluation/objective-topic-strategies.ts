/**
 * Category → seed strategy registry — thin orchestrator.
 *
 * Each of the four marketing jobs has its own builder under ./ots/, with the
 * shared seed helpers in ots/types.ts.
 */
import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";

import { buildCustomerQuestionSeeds } from "./ots/customer-questions";
import { buildOffersConversionSeeds } from "./ots/offers-conversion";
import { buildProductEducationSeeds } from "./ots/product-education";
import { buildTrustProofSeeds } from "./ots/trust-proof";
import type { CategoryTopicStrategy, TopicSeed } from "./ots/types";
import type { TopicSubject } from "./topic-subject";
import { classifyContextSubjects } from "./topic-subject";

export type { CategoryTopicStrategy, TopicSeed };
export {
  buildCustomerQuestionSeeds,
  buildOffersConversionSeeds,
  buildProductEducationSeeds,
  buildTrustProofSeeds,
};

/** Sole category → seed strategy registry. */
export const categoryTopicStrategies: Record<
  TopicCategoryId,
  CategoryTopicStrategy
> = {
  customer_questions: buildCustomerQuestionSeeds,
  product_education: buildProductEducationSeeds,
  trust_proof: buildTrustProofSeeds,
  offers_conversion: buildOffersConversionSeeds,
};

export function buildObjectiveTopicSeeds(
  context: ContentBrainContext,
  objective: TopicCategoryId,
  extraSubjects: TopicSubject[] = []
): TopicSeed[] {
  const subjects = [...classifyContextSubjects(context), ...extraSubjects];
  return categoryTopicStrategies[objective](context, subjects);
}

export { classifyContextSubjects };
