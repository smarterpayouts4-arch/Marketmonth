import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";

import { buildTopicEvidenceIndex } from "../evidence";
import type { TopicSeed } from "../objective-topic-strategies";
import type { TopicCandidateScore } from "../topic-candidate-types";
import type { FramedCandidate } from "./frame-title";
import { preferredKindBoost } from "./preferred-kinds";
import { isGenericDecisionTitle } from "./text";

export type ScoredCandidate = FramedCandidate & {
  score: TopicCandidateScore;
  /** Present when topic-title-hook ran before scoring. */
  titleHook?: import("./topic-title-hook/types").TopicTitleHookResult;
};

/** Score-component weights (topic-candidate-score-v2). Must sum to 1. */
export const SCORE_WEIGHTS = {
  objectiveAlignment: 0.18,
  subjectKindFit: 0.16,
  contextGrounding: 0.14,
  audienceRelevance: 0.1,
  evidenceGrounding: 0.12,
  specificity: 0.12,
  novelty: 0.1,
  clarity: 0.08,
} as const;

/**
 * Human-readable component breakdown: which components carried the score
 * and which dragged it — for the Inspector and for eval debugging.
 */
export function explainScore(score: TopicCandidateScore): string[] {
  const parts = (
    Object.keys(SCORE_WEIGHTS) as (keyof typeof SCORE_WEIGHTS)[]
  ).map((key) => ({
    key,
    value: score[key],
    weighted: Math.round(score[key] * SCORE_WEIGHTS[key] * 1000) / 1000,
  }));
  parts.sort((a, b) => b.weighted - a.weighted);
  return parts.map(
    (p) =>
      `${p.key}: ${p.value.toFixed(2)} × ${SCORE_WEIGHTS[p.key]} = ${p.weighted.toFixed(3)}`
  );
}

export function scoreCandidate(args: {
  title: string;
  seed: TopicSeed;
  objective: TopicCategoryId;
  context: ContentBrainContext;
  recentKeys: Set<string>;
  audience: string;
  /** Average evidence qualityScore (0–1) for the seed's evidenceIds. */
  evidenceQuality?: number;
}): TopicCandidateScore {
  const { title, seed, objective, recentKeys, audience } = args;
  const titleKey = title.trim().toLowerCase();
  const novelty = recentKeys.has(titleKey) ? 0.2 : 0.95;
  const wordCount = title.split(/\s+/).filter(Boolean).length;

  const objectiveAlignment = preferredKindBoost(seed.subjectType, objective);
  let subjectKindFit = preferredKindBoost(seed.subjectType, objective);
  if (
    objective === "product_education" &&
    seed.subjectType === "platform_capability"
  ) {
    subjectKindFit = 0.05;
  }
  let contextGrounding = Math.min(
    1,
    0.35 +
      seed.sourceFields.length * 0.2 +
      (title.toLowerCase().includes(seed.subject.toLowerCase().slice(0, 12))
        ? 0.35
        : 0.1)
  );
  let audienceRelevance = Math.min(
    1,
    0.4 +
      (seed.audienceNeed ? 0.35 : 0.1) +
      (audience.length > 20 ? 0.15 : 0)
  );
  // Evidence count sets the base; evidence quality scales it so three weak
  // rows no longer outrank one strong one.
  const qualityFactor =
    args.evidenceQuality !== undefined
      ? 0.6 + 0.4 * Math.max(0, Math.min(1, args.evidenceQuality))
      : 1;
  let evidenceGrounding = Math.min(
    1,
    (0.2 + Math.min(seed.evidenceIds.length, 3) * 0.25) * qualityFactor
  );

  // Industry research scores lower when connection is thinner / confidence low
  if (seed.sourceType === "industry_research") {
    contextGrounding = Math.max(0, contextGrounding - 0.12);
    if (!seed.audienceNeed) {
      audienceRelevance = Math.max(0, audienceRelevance - 0.2);
    }
    if (seed.classificationConfidence === "low") {
      evidenceGrounding = Math.max(0, evidenceGrounding - 0.15);
    }
    if (/\b(treat|cure|heal|diagnos)\b/i.test(title)) {
      subjectKindFit = 0.05;
    }
  }
  const specificity = Math.min(
    1,
    0.25 +
      Math.min(wordCount, 12) * 0.04 +
      (seed.classificationConfidence === "high"
        ? 0.2
        : seed.classificationConfidence === "medium"
          ? 0.12
          : 0.04)
  );
  const clarity = Math.min(
    1,
    0.45 +
      (title.includes("?") ? 0.05 : 0.15) +
      (isGenericDecisionTitle(title) ? -0.4 : 0.2)
  );

  const overall =
    Math.round(
      (objectiveAlignment * SCORE_WEIGHTS.objectiveAlignment +
        subjectKindFit * SCORE_WEIGHTS.subjectKindFit +
        contextGrounding * SCORE_WEIGHTS.contextGrounding +
        audienceRelevance * SCORE_WEIGHTS.audienceRelevance +
        evidenceGrounding * SCORE_WEIGHTS.evidenceGrounding +
        specificity * SCORE_WEIGHTS.specificity +
        novelty * SCORE_WEIGHTS.novelty +
        clarity * SCORE_WEIGHTS.clarity) *
        100
    ) / 100;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    objectiveAlignment: round2(objectiveAlignment),
    subjectKindFit: round2(subjectKindFit),
    contextGrounding: round2(contextGrounding),
    audienceRelevance: round2(audienceRelevance),
    evidenceGrounding: round2(evidenceGrounding),
    specificity: round2(specificity),
    novelty: round2(novelty),
    clarity: round2(Math.max(0, clarity)),
    overall,
  };
}

function averageEvidenceQuality(
  seed: TopicSeed,
  qualityById: Map<string, number>
): number | undefined {
  const scores = seed.evidenceIds
    .map((id) => qualityById.get(id))
    .filter((q): q is number => typeof q === "number");
  if (scores.length === 0) return undefined;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function scoreCandidates(
  drafts: FramedCandidate[],
  args: {
    objective: TopicCategoryId;
    context: ContentBrainContext;
    recentKeys: Set<string>;
    audience: string;
  }
): ScoredCandidate[] {
  const evidenceIndex = buildTopicEvidenceIndex(args.context);
  const qualityById = new Map<string, number>(
    evidenceIndex.items
      .filter((i) => typeof i.qualityScore === "number")
      .map((i) => [i.id, i.qualityScore as number])
  );
  return drafts.map((d) => ({
    ...d,
    score: scoreCandidate({
      title: d.title,
      seed: d.seed,
      objective: args.objective,
      context: args.context,
      recentKeys: args.recentKeys,
      audience: args.audience,
      evidenceQuality: averageEvidenceQuality(d.seed, qualityById),
    }),
  }));
}
