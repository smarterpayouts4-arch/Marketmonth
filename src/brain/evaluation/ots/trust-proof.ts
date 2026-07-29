import {
  audienceNeedFrom,
  dedupeSeeds,
  ofKind,
  seedFrom,
  type CategoryTopicStrategy,
  type TopicSeed,
} from "./types";

/**
 * Trust & Proof: show something verifiable the company already published.
 *
 * method_limits is intentional — stating what the company will NOT claim is
 * stronger proof than asserting credibility, and it is always grounded, because
 * a disclaimer is published text.
 */
export const buildTrustProofSeeds: CategoryTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = audienceNeedFrom(subjects);

  for (const s of ofKind(subjects, ["trust_method"]).slice(0, 5)) {
    seeds.push(seedFrom(s, "transparency", need));
    seeds.push(seedFrom(s, "method_limits", need));
  }
  for (const s of ofKind(subjects, ["faq_topic"]).slice(0, 4)) {
    seeds.push(seedFrom(s, "faq_education", need));
    seeds.push(seedFrom(s, "transparency", need));
  }
  for (const s of ofKind(subjects, ["brand_position"]).slice(0, 2)) {
    seeds.push(seedFrom(s, "credibility_position", need));
  }

  return dedupeSeeds(seeds).slice(0, 8);
};
