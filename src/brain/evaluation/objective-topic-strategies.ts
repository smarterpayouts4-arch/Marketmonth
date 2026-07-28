import type { MarketingFocus } from "@/brain/content/marketing-focus";
import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicSubject, TopicSubjectKind } from "./topic-subject";
import {
  classifyContextSubjects,
  isProductEducationEligible,
  isPrimaryProductEducationSubject,
} from "./topic-subject";

export type TopicSeed = {
  subject: string;
  subjectType: TopicSubjectKind;
  audienceNeed?: string;
  evidenceIds: string[];
  sourceFields: string[];
  classificationReason: string;
  classificationConfidence: "high" | "medium" | "low";
  frameHint: string;
  sourceType?: "brand_observed" | "industry_research";
  supportFamilyKey?: string;
};

export type ObjectiveTopicStrategy = (
  context: ContentBrainContext,
  subjects: TopicSubject[]
) => TopicSeed[];

function seedFrom(
  s: TopicSubject,
  frameHint: string,
  audienceNeed?: string
): TopicSeed {
  return {
    subject: s.label,
    subjectType: s.kind,
    audienceNeed,
    evidenceIds: [...s.evidenceIds],
    sourceFields: [s.sourceField],
    classificationReason: s.classificationReason,
    classificationConfidence: s.classificationConfidence,
    frameHint,
    sourceType: s.sourceType ?? "brand_observed",
    supportFamilyKey: s.supportFamilyKey,
  };
}

function ofKind(subjects: TopicSubject[], kinds: TopicSubjectKind[]): TopicSubject[] {
  return subjects.filter((s) => kinds.includes(s.kind));
}

export const buildBrandAwarenessSeeds: ObjectiveTopicStrategy = (
  context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const brand = ofKind(subjects, ["brand_position"]);
  const audience = ofKind(subjects, ["audience_problem"]);
  const category = ofKind(subjects, ["product_category"]);
  const need = audience[0]?.label ?? context.audience;

  // Prefer brand + audience recognition before category/platform
  for (const s of audience.slice(0, 2)) {
    seeds.push(seedFrom(s, "audience_recognition", need));
  }
  for (const s of brand.slice(0, 2)) {
    seeds.push(seedFrom(s, "meet_brand", need));
    seeds.push(seedFrom(s, "category_recognition", need));
  }
  for (const s of category.slice(0, 2)) {
    seeds.push(seedFrom(s, "category_intro", need));
  }
  // Platform only as secondary recognition context
  for (const s of ofKind(subjects, ["platform_capability"]).slice(0, 2)) {
    seeds.push(seedFrom(s, "platform_in_category", need));
  }
  return dedupeSeeds(seeds).slice(0, 8);
};

export const buildValuePropositionSeeds: ObjectiveTopicStrategy = (
  context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = ofKind(subjects, ["audience_problem"])[0]?.label;
  for (const s of ofKind(subjects, ["brand_position"]).slice(0, 2)) {
    seeds.push(seedFrom(s, "why_brand", need));
    seeds.push(seedFrom(s, "clarity_outcome", need));
  }
  for (const s of ofKind(subjects, ["platform_capability"]).slice(0, 4)) {
    seeds.push(seedFrom(s, "capability_value", need));
  }
  for (const s of ofKind(subjects, ["audience_problem"]).slice(0, 2)) {
    seeds.push(seedFrom(s, "uncertainty_reduction", need));
  }
  return dedupeSeeds(seeds).slice(0, 8);
};

/**
 * Product education: researched products/categories/attributes — never platform primary.
 * Strategies must not re-label subject kinds.
 */
export const buildProductEducationSeeds: ObjectiveTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = ofKind(subjects, ["audience_problem"])[0]?.label;

  const primary = subjects.filter(isPrimaryProductEducationSubject);
  const eligible = subjects.filter(isProductEducationEligible);

  // Attributes first — richest grounded education from discovery opportunities
  for (const s of eligible.filter((x) => x.kind === "comparison_attribute")) {
    seeds.push(seedFrom(s, "attribute_education", need));
  }
  for (const s of eligible.filter((x) => x.kind === "product_category")) {
    seeds.push(seedFrom(s, "category_education", need));
    seeds.push(seedFrom(s, "product_guide", need));
    seeds.push(seedFrom(s, "evaluate_product", need));
  }
  for (const s of primary.filter(
    (x) =>
      x.kind === "catalog_product" || x.kind === "ingredient_or_component"
  )) {
    seeds.push(seedFrom(s, "product_guide", need));
    seeds.push(seedFrom(s, "evaluate_product", need));
  }

  // Explicitly skip platform_capability — never primary product education
  return dedupeSeeds(seeds).slice(0, 10);
};

export const buildDecisionSupportSeeds: ObjectiveTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = ofKind(subjects, ["audience_problem"])[0]?.label;
  for (const s of ofKind(subjects, ["decision_criterion"]).slice(0, 5)) {
    seeds.push(seedFrom(s, "decision_checklist", need));
    seeds.push(seedFrom(s, "tradeoff_frame", need));
  }
  for (const s of ofKind(subjects, ["comparison_attribute"]).slice(0, 3)) {
    seeds.push(seedFrom(s, "compare_criteria", need));
  }
  return dedupeSeeds(seeds).slice(0, 8);
};

export const buildTrustAuthoritySeeds: ObjectiveTopicStrategy = (
  _context,
  subjects
) => {
  const seeds: TopicSeed[] = [];
  const need = ofKind(subjects, ["audience_problem"])[0]?.label;
  for (const s of ofKind(subjects, ["trust_method"]).slice(0, 5)) {
    seeds.push(seedFrom(s, "transparency", need));
    seeds.push(seedFrom(s, "method_limits", need));
  }
  for (const s of ofKind(subjects, ["brand_position"]).slice(0, 2)) {
    seeds.push(seedFrom(s, "credibility_position", need));
  }
  return dedupeSeeds(seeds).slice(0, 8);
};

function dedupeSeeds(seeds: TopicSeed[]): TopicSeed[] {
  const seen = new Set<string>();
  const out: TopicSeed[] = [];
  for (const s of seeds) {
    const key = `${s.subjectType}|${s.subject.toLowerCase()}|${s.frameHint}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

/** Sole objective → seed strategy registry. */
export const objectiveTopicStrategies: Record<
  MarketingFocus,
  ObjectiveTopicStrategy
> = {
  brand_awareness: buildBrandAwarenessSeeds,
  value_proposition: buildValuePropositionSeeds,
  product_education: buildProductEducationSeeds,
  decision_support: buildDecisionSupportSeeds,
  trust_authority: buildTrustAuthoritySeeds,
};

export function buildObjectiveTopicSeeds(
  context: ContentBrainContext,
  objective: MarketingFocus,
  extraSubjects: TopicSubject[] = []
): TopicSeed[] {
  const subjects = [...classifyContextSubjects(context), ...extraSubjects];
  return objectiveTopicStrategies[objective](context, subjects);
}

export { classifyContextSubjects };
