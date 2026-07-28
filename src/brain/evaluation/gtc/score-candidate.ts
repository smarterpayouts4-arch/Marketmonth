import type { MarketingFocus } from "@/brain/content/marketing-focus";
import type { ContentBrainContext } from "@/brain/content/types";

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

export function scoreCandidate(args: {
  title: string;
  seed: TopicSeed;
  objective: MarketingFocus;
  context: ContentBrainContext;
  recentKeys: Set<string>;
  audience: string;
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
  let evidenceGrounding = Math.min(
    1,
    0.2 + Math.min(seed.evidenceIds.length, 3) * 0.25
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
      (objectiveAlignment * 0.18 +
        subjectKindFit * 0.16 +
        contextGrounding * 0.14 +
        audienceRelevance * 0.1 +
        evidenceGrounding * 0.12 +
        specificity * 0.12 +
        novelty * 0.1 +
        clarity * 0.08) *
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

export function scoreCandidates(
  drafts: FramedCandidate[],
  args: {
    objective: MarketingFocus;
    context: ContentBrainContext;
    recentKeys: Set<string>;
    audience: string;
  }
): ScoredCandidate[] {
  return drafts.map((d) => ({
    ...d,
    score: scoreCandidate({
      title: d.title,
      seed: d.seed,
      objective: args.objective,
      context: args.context,
      recentKeys: args.recentKeys,
      audience: args.audience,
    }),
  }));
}
