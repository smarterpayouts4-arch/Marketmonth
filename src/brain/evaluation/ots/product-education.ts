import {
  isPrimaryProductEducationSubject,
  isProductEducationEligible,
} from "../topic-subject";
import {
  audienceNeedFrom,
  dedupeSeeds,
  seedFrom,
  type CategoryTopicStrategy,
  type TopicSeed,
} from "./types";

/**
 * Product Education: teach the category so the reader can judge options.
 *
 * platform_capability is deliberately excluded — walking through the company's
 * own interface is a product demo, not education. Strategies must not re-label
 * subject kinds; eligibility is decided by topic-subject.
 */
export const buildProductEducationSeeds: CategoryTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = audienceNeedFrom(subjects);

  const primary = subjects.filter(isPrimaryProductEducationSubject);
  const eligible = subjects.filter(isProductEducationEligible);

  for (const s of eligible.filter((x) => x.kind === "health_outcome")) {
    seeds.push(seedFrom(s, "outcome_education", need));
    seeds.push(seedFrom(s, "label_deconstruction", need));
  }

  // Attributes first — richest grounded education from discovery opportunities.
  for (const s of eligible.filter((x) => x.kind === "comparison_attribute")) {
    seeds.push(seedFrom(s, "attribute_education", need));
  }
  for (const s of eligible.filter((x) => x.kind === "product_category")) {
    seeds.push(seedFrom(s, "category_education", need));
    seeds.push(seedFrom(s, "product_guide", need));
    seeds.push(seedFrom(s, "evaluate_product", need));
  }
  for (const s of primary.filter(
    (x) => x.kind === "catalog_product" || x.kind === "ingredient_or_component"
  )) {
    seeds.push(seedFrom(s, "product_guide", need));
    seeds.push(seedFrom(s, "evaluate_product", need));
  }

  return dedupeSeeds(seeds).slice(0, 10);
};
