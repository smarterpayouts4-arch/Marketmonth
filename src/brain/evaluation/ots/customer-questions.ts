import {
  audienceNeedFrom,
  dedupeSeeds,
  ofKind,
  seedFrom,
  type CategoryTopicStrategy,
  type TopicSeed,
} from "./types";

/**
 * Customer Questions: answer what people ask before they buy.
 *
 * FAQ topics lead deliberately. The retired decision_support objective drew only
 * on decision_criterion and returned zero candidates for Zynava, whose criteria
 * were bare vitamin names — while 20 usable FAQ rows sat unread. Questions the
 * company has already answered are the strongest grounding available here.
 */
export const buildCustomerQuestionSeeds: CategoryTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = audienceNeedFrom(subjects);

  for (const s of ofKind(subjects, ["faq_topic"]).slice(0, 5)) {
    seeds.push(seedFrom(s, "faq_education", need));
    seeds.push(seedFrom(s, "decision_checklist", need));
  }
  for (const s of ofKind(subjects, ["decision_criterion"]).slice(0, 4)) {
    seeds.push(seedFrom(s, "decision_checklist", need));
    seeds.push(seedFrom(s, "tradeoff_frame", need));
  }
  for (const s of ofKind(subjects, ["audience_problem"]).slice(0, 3)) {
    seeds.push(seedFrom(s, "uncertainty_reduction", need));
  }
  for (const s of ofKind(subjects, ["comparison_attribute"]).slice(0, 3)) {
    seeds.push(seedFrom(s, "compare_criteria", need));
  }

  return dedupeSeeds(seeds).slice(0, 10);
};
