import { shortHash } from "@/brain/content/evidence";
import {
  MARKETING_FOCUS_LABELS,
  type MarketingFocus,
} from "@/brain/content/marketing-focus";
import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicSeed } from "../objective-topic-strategies";
import {
  INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS,
  TOPIC_CANDIDATE_SCORE_VERSION,
  type TopicCandidate,
  type TopicCandidateGenerationResult,
  type TopicGenerationWarning,
} from "../topic-candidate-types";
import type { TopicSubjectKind } from "../topic-subject";
import type { ScoredCandidate } from "./score-candidate";
import { selectDistinctSupportKeys } from "./support-key";
import { clamp } from "./text";
import type { TopicTitleHookResult } from "./topic-title-hook/types";

function titleHookOf(
  s: ScoredCandidate
): TopicTitleHookResult | undefined {
  const maybe = s as ScoredCandidate & { titleHook?: TopicTitleHookResult };
  return maybe.titleHook;
}

export const COMPLETE_COUNT = 6;

function audiencePainFromSeed(
  context: ContentBrainContext,
  objective: MarketingFocus,
  seed: TopicSeed | undefined
): string {
  const subject = seed?.subject || "the category";
  switch (objective) {
    case "brand_awareness":
      return `Prospects do not yet recognize what ${context.brandName} stands for around ${clamp(subject, 40)}.`;
    case "value_proposition":
      return `Buyers struggle to see why ${context.brandName} makes decisions clearer.`;
    case "product_education":
      return `People need clearer education about ${clamp(subject, 50)} — not platform tutorials.`;
    case "decision_support":
      return `Decision-makers lack a practical frame for: ${clamp(seed?.audienceNeed || subject, 80)}.`;
    case "trust_authority":
      return `The audience needs credible proof before trusting ${context.brandName}.`;
  }
}

function toCandidates(
  ranked: ScoredCandidate[],
  context: ContentBrainContext,
  objective: MarketingFocus,
  audience: string
): TopicCandidate[] {
  return ranked.map((s, i) => {
    const rank = i + 1;
    const sourceField = s.seed.sourceFields[0] ?? "context";
    return {
      topicId: `tc_${shortHash(`${objective}|${s.title}|${rank}`)}`,
      rank,
      title: s.title,
      originalTitle: s.title,
      titleSource: "deterministic-v2" as const,
      objective,
      audience,
      audiencePain: audiencePainFromSeed(context, objective, s.seed),
      strategicAngle: s.strategicAngle,
      relevanceReasons: [
        ...s.relevanceReasons,
        s.seed.sourceType === "industry_research"
          ? "Provenance: industry_research (not brand catalog)"
          : "Provenance: brand_observed",
      ],
      evidenceIds: s.seed.evidenceIds,
      subject: {
        label: s.seed.subject,
        kind: s.seed.subjectType,
        sourceField,
        evidenceIds: [...s.seed.evidenceIds],
        classificationConfidence: s.seed.classificationConfidence,
        sourceType: s.seed.sourceType ?? "brand_observed",
      },
      subjectKind: s.seed.subjectType,
      sourceFields: s.seed.sourceFields,
      classificationReason: s.seed.classificationReason,
      classificationConfidence: s.seed.classificationConfidence,
      score: s.score,
      scoreVersion: TOPIC_CANDIDATE_SCORE_VERSION,
      recommended: rank === 1,
      titleHookVersion: titleHookOf(s)?.titleHookVersion,
      titleItchType: titleHookOf(s)?.itchType,
    };
  });
}

function rankScored(scored: ScoredCandidate[]): ScoredCandidate[] {
  const byTitle = new Map<string, ScoredCandidate>();
  for (const b of scored) {
    const key = b.title.toLowerCase();
    const prev = byTitle.get(key);
    if (!prev || b.score.overall > prev.score.overall) byTitle.set(key, b);
  }
  return [...byTitle.values()].sort(
    (a, b) => b.score.overall - a.score.overall
  );
}

/**
 * Assemble complete | limited | insufficient from scored drafts.
 * Grounded support-key uniqueness remains mandatory.
 * Display-intent uniqueness is an additional final-set quality gate
 * (selectDistinctSupportKeys). Completeness is re-derived from the
 * filtered list — framing/title shells alone cannot unlock complete.
 */
export function assembleCandidateResult(args: {
  scored: ScoredCandidate[];
  seeds: TopicSeed[];
  context: ContentBrainContext;
  objective: MarketingFocus;
  audience: string;
}): TopicCandidateGenerationResult {
  const { scored, seeds, context, objective, audience } = args;
  const ranked = rankScored(scored);

  if (objective === "product_education") {
    const educationKinds = new Set<TopicSubjectKind>([
      "catalog_product",
      "ingredient_or_component",
      "product_category",
      "comparison_attribute",
    ]);
    const approvedFromSeeds = seeds.filter((s) =>
      educationKinds.has(s.subjectType)
    );

    if (ranked.length === 0 || approvedFromSeeds.length === 0) {
      return {
        status: "insufficient_context",
        candidates: [],
        diagnostic: {
          code: INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS,
          message:
            "No grounded product category, ingredient, catalog product, or comparison attribute was found.",
        },
      };
    }

    const distinct = selectDistinctSupportKeys(ranked, COMPLETE_COUNT);
    const canComplete = distinct.length >= COMPLETE_COUNT;

    if (!canComplete) {
      const limited = distinct.slice(0, Math.min(5, distinct.length));
      if (limited.length === 0) {
        return {
          status: "insufficient_context",
          candidates: [],
          diagnostic: {
            code: INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS,
            message:
              "No grounded product category, ingredient, catalog product, or comparison attribute was found.",
          },
        };
      }
      const warnings: TopicGenerationWarning[] = [
        {
          code: "LIMITED_PRODUCT_EDUCATION_SUBJECTS",
          message: `We found ${limited.length} evidence-grounded Product education topic${limited.length === 1 ? "" : "s"} with distinct support. Add catalog or attribute research to reach six.`,
        },
      ];
      return {
        status: "success",
        completeness: "limited",
        candidates: toCandidates(limited, context, objective, audience),
        warnings,
      };
    }

    const top6 = distinct.slice(0, COMPLETE_COUNT) as [
      ScoredCandidate,
      ScoredCandidate,
      ScoredCandidate,
      ScoredCandidate,
      ScoredCandidate,
      ScoredCandidate,
    ];
    return {
      status: "success",
      completeness: "complete",
      candidates: toCandidates(top6, context, objective, audience) as [
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
        TopicCandidate,
      ],
      warnings: [],
    };
  }

  const distinct = selectDistinctSupportKeys(ranked, COMPLETE_COUNT);

  if (distinct.length < COMPLETE_COUNT) {
    if (distinct.length === 0) {
      return {
        status: "insufficient_context",
        candidates: [],
        diagnostic: {
          code: "INSUFFICIENT_TOPIC_SUBJECTS",
          message: `Not enough grounded subjects to build ${MARKETING_FOCUS_LABELS[objective]} topics.`,
        },
      };
    }
    return {
      status: "success",
      completeness: "limited",
      candidates: toCandidates(
        distinct.slice(0, Math.min(5, distinct.length)),
        context,
        objective,
        audience
      ),
      warnings: [
        {
          code: "LIMITED_TOPIC_SUBJECTS",
          message: `We found ${Math.min(5, distinct.length)} grounded ${MARKETING_FOCUS_LABELS[objective]} topic(s). Enrich brand context to reach six.`,
        },
      ],
    };
  }

  const top6 = distinct.slice(0, COMPLETE_COUNT) as [
    ScoredCandidate,
    ScoredCandidate,
    ScoredCandidate,
    ScoredCandidate,
    ScoredCandidate,
    ScoredCandidate,
  ];
  const candidates = toCandidates(top6, context, objective, audience) as [
    TopicCandidate,
    TopicCandidate,
    TopicCandidate,
    TopicCandidate,
    TopicCandidate,
    TopicCandidate,
  ];

  return {
    status: "success",
    completeness: "complete",
    candidates,
    warnings: [],
  };
}
