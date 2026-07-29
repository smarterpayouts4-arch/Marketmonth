import { shortHash } from "@/brain/content/evidence";
import {
  TOPIC_CATEGORY_LABELS,
  type TopicCategoryId,
} from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";

import type { TopicSeed } from "../objective-topic-strategies";
import {
  INSUFFICIENT_PRODUCT_EDUCATION_SUBJECTS,
  NO_PUBLISHED_COMMERCIAL_TERMS,
  TOPIC_CANDIDATE_SCORE_VERSION,
  type TopicCandidate,
  type TopicCandidateGenerationResult,
  type TopicGenerationWarning,
} from "../topic-candidate-types";
import type { TopicSubjectKind } from "../topic-subject";
import { explainScore, type ScoredCandidate } from "./score-candidate";
import { selectDistinctSupportKeys } from "./support-key";
import { clamp } from "./text";
import type { TopicTitleHookResult } from "./topic-title-hook/types";
import type { LlmFramedCandidate } from "./llm-candidates/map-llm-candidates";

function titleHookOf(
  s: ScoredCandidate
): TopicTitleHookResult | undefined {
  const maybe = s as ScoredCandidate & { titleHook?: TopicTitleHookResult };
  return maybe.titleHook;
}

function llmMetaOf(s: ScoredCandidate): LlmFramedCandidate["llmMeta"] | undefined {
  const maybe = s as ScoredCandidate & { llmMeta?: LlmFramedCandidate["llmMeta"] };
  return maybe.llmMeta;
}

function titleSourceOf(
  s: ScoredCandidate
): "llm-generated" | "deterministic-v2" {
  const maybe = s as ScoredCandidate & { titleSource?: "llm-generated" };
  return maybe.titleSource === "llm-generated" ? "llm-generated" : "deterministic-v2";
}

export const COMPLETE_COUNT = 6;

function audiencePainFromSeed(
  context: ContentBrainContext,
  objective: TopicCategoryId,
  seed: TopicSeed | undefined
): string {
  const subject = seed?.subject || "the category";
  switch (objective) {
    case "offers_conversion":
      return `Buyers struggle to see why ${context.brandName} makes decisions clearer — what it costs, what is included, and how to proceed.`;
    case "product_education":
      return `People need clearer education about ${clamp(subject, 50)} — not platform tutorials.`;
    case "customer_questions":
      return `Decision-makers lack a practical frame for: ${clamp(seed?.audienceNeed || subject, 80)}.`;
    case "trust_proof":
      return `The audience needs credible proof before trusting ${context.brandName}.`;
  }
}

function toCandidates(
  ranked: ScoredCandidate[],
  context: ContentBrainContext,
  objective: TopicCategoryId,
  audience: string
): TopicCandidate[] {
  return ranked.map((s, i) => {
    const rank = i + 1;
    const sourceField = s.seed.sourceFields[0] ?? "context";
    const llm = llmMetaOf(s);
    const titleSource = titleSourceOf(s);
    return {
      topicId: `tc_${shortHash(`${objective}|${s.title}|${rank}`)}`,
      rank,
      title: s.title,
      titleSource,
      categoryId: objective,
      objective,
      audience,
      audiencePain: audiencePainFromSeed(context, objective, s.seed),
      strategicAngle: s.strategicAngle,
      hook: llm?.hook,
      audienceQuestion: llm?.audienceQuestion ?? s.seed.audienceNeed,
      whyItFits: llm?.whyItFits,
      suggestedFormats: llm?.suggestedFormats,
      platformFit: llm?.platformFit,
      funnelRole: llm?.funnelRole,
      evidenceRefs: llm ? [...s.seed.evidenceIds] : undefined,
      confidence: llm?.confidence,
      relevanceReasons: [
        ...s.relevanceReasons,
        s.seed.sourceType === "industry_research"
          ? "Provenance: industry_research (not brand catalog)"
          : titleSource === "llm-generated"
            ? "Provenance: llm-generated from selected evidence"
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
      scoreExplanation: explainScore(s.score),
      recommended: rank === 1,
      titleHookVersion: titleHookOf(s)?.titleHookVersion,
      titleItchType: llm?.itchType ?? titleHookOf(s)?.itchType,
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

function itchTypeOf(s: ScoredCandidate): string {
  return llmMetaOf(s)?.itchType ?? titleHookOf(s)?.itchType ?? "unknown";
}

/**
 * Itch-type diversity: when two candidates score within epsilon, prefer the
 * one with an itch type not already used — a slate of six near-identical
 * curiosity shapes reads templated even when subjects differ.
 */
function diversifyByItchType(
  ranked: ScoredCandidate[],
  epsilon = 0.05
): ScoredCandidate[] {
  const remaining = [...ranked];
  const out: ScoredCandidate[] = [];
  const seen = new Set<string>();
  while (remaining.length > 0) {
    let pick = 0;
    if (seen.has(itchTypeOf(remaining[0]!))) {
      const bestScore = remaining[0]!.score.overall;
      const alt = remaining.findIndex(
        (c) =>
          bestScore - c.score.overall <= epsilon && !seen.has(itchTypeOf(c))
      );
      if (alt > 0) pick = alt;
    }
    const [chosen] = remaining.splice(pick, 1);
    seen.add(itchTypeOf(chosen!));
    out.push(chosen!);
  }
  return out;
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
  objective: TopicCategoryId;
  audience: string;
}): TopicCandidateGenerationResult {
  const { scored, seeds, context, objective, audience } = args;
  const ranked = diversifyByItchType(rankScored(scored));

  if (objective === "product_education") {
    const educationKinds = new Set<TopicSubjectKind>([
      "health_outcome",
      "catalog_product",
      "ingredient_or_component",
      "product_category",
      "comparison_attribute",
      "faq_topic",
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
      const hasCommercialTerms = (context.commercialTerms?.length ?? 0) > 0;
      if (objective === "offers_conversion" && !hasCommercialTerms) {
        return {
          status: "insufficient_context",
          candidates: [],
          diagnostic: {
            code: NO_PUBLISHED_COMMERCIAL_TERMS,
            message:
              "No published commercial terms (pricing, guarantees, or purchase mechanics) were found in the approved artifact.",
          },
        };
      }
      return {
        status: "insufficient_context",
        candidates: [],
        diagnostic: {
          code: "INSUFFICIENT_TOPIC_SUBJECTS",
          message: `Not enough grounded subjects to build ${TOPIC_CATEGORY_LABELS[objective]} topics.`,
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
          message: `We found ${Math.min(5, distinct.length)} grounded ${TOPIC_CATEGORY_LABELS[objective]} topic(s). Enrich brand context to reach six.`,
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
