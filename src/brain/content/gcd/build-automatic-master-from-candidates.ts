import { generateTopicCandidates } from "@/brain/evaluation/generate-topic-candidates";
import type { TopicCategoryId } from "@/brain/content/topic-category";

import { shortHash } from "../evidence";
import { evaluateSafety, mergeSafety } from "../safety";
import type { ContentBrainContext, MasterTopic } from "../types";
import { clamp } from "../providers/deterministic/text";

/**
 * Automatic master topic = top ranked candidate from generateTopicCandidates.
 * Sole product automatic path — replaces template-only buildAutomaticMaster.
 */
export function buildAutomaticMasterFromCandidates(
  context: ContentBrainContext,
  recentMasterTopics: string[] = [],
  topicCategory: TopicCategoryId = "product_education"
): MasterTopic | null {
  const result = generateTopicCandidates({
    context,
    objective: topicCategory,
    recentTitles: recentMasterTopics,
    includeIndustryResearch: false,
  });

  if (result.status !== "success" || result.candidates.length === 0) {
    return null;
  }

  const pick =
    result.candidates.find((c) => c.recommended) ?? result.candidates[0];

  const punchline = clamp(pick.title, 90);
  const subheading = clamp(
    context.valueProposition?.trim() ||
      context.description?.trim() ||
      `A practical umbrella for ${context.brandName} content`,
    150
  );
  const rationale = clamp(
    [
      `Ranked topic candidate (${pick.rank}/${result.candidates.length}) via generateTopicCandidates.`,
      pick.strategicAngle,
      pick.classificationReason,
    ]
      .filter(Boolean)
      .join(" "),
    280
  );
  // No arbitrary evidence backfill — insufficient grounding surfaces as null.
  if (pick.evidenceIds.length === 0) {
    return null;
  }
  const evidenceIds = [...pick.evidenceIds];

  const safety = mergeSafety(
    evaluateSafety(punchline),
    evaluateSafety(subheading),
    evaluateSafety(rationale)
  );

  const confidence: MasterTopic["confidence"] =
    evidenceIds.length >= 3
      ? "high"
      : evidenceIds.length >= 1
        ? "medium"
        : "low";

  return {
    id: `master_${shortHash(`auto|${context.contextVersion}|${punchline}`)}`,
    source: "automatic",
    punchline,
    subheading,
    rationale,
    evidenceIds,
    confidence,
    safety,
  };
}
