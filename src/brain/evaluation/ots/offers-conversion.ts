import {
  audienceNeedFrom,
  dedupeSeeds,
  ofKind,
  seedFrom,
  type CategoryTopicStrategy,
  type TopicSeed,
} from "./types";

/**
 * Offers & Conversion: make the terms of doing business legible.
 *
 * Grounded in what the company actually publishes about transacting — its value
 * proposition, capabilities, CTAs, and the questions it answers about cost and
 * commitment. It deliberately does NOT read the CSV `offer` rows: those are an
 * unreliable slot that has carried mislabelled product names, and both verified
 * fixtures yield six distinct conversion supports without a single offer row.
 */
export const buildOffersConversionSeeds: CategoryTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = audienceNeedFrom(subjects);

  for (const s of ofKind(subjects, ["platform_capability"]).slice(0, 4)) {
    seeds.push(seedFrom(s, "capability_value", need));
  }
  for (const s of ofKind(subjects, ["comparison_attribute"]).slice(0, 3)) {
    seeds.push(seedFrom(s, "compare_criteria", need));
  }
  for (const s of ofKind(subjects, ["brand_position"]).slice(0, 2)) {
    seeds.push(seedFrom(s, "why_brand", need));
    seeds.push(seedFrom(s, "clarity_outcome", need));
  }
  for (const s of ofKind(subjects, ["faq_topic"]).slice(0, 3)) {
    seeds.push(seedFrom(s, "faq_education", need));
  }

  return dedupeSeeds(seeds).slice(0, 10);
};
