import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";

import { buildTopicEvidenceIndex } from "../../evidence";
import type { TopicSeed } from "../../objective-topic-strategies";
import type { TopicSubjectKind } from "../../topic-subject";
import type { FramedCandidate } from "../frame-title";
import type { ValidatedLlmTopicCandidate } from "./types";

export type LlmCandidateDraftMeta = {
  hook?: string;
  audienceQuestion?: string;
  whyItFits?: string;
  suggestedFormats?: string[];
  platformFit?: string[];
  funnelRole?: string;
  confidence?: number;
  itchType?: string;
};

export type LlmFramedCandidate = FramedCandidate & {
  llmMeta: LlmCandidateDraftMeta;
  titleSource: "llm-generated";
};

function inferSubjectKind(field: string): TopicSubjectKind {
  const f = field.toLowerCase();
  if (/faq|question/.test(f)) return "faq_topic";
  if (/indexedproduct|catalogproduct|product/.test(f)) return "catalog_product";
  if (/ingredient|knowsabout|ownedtopic|educational/.test(f)) {
    return "ingredient_or_component";
  }
  if (/testimonial|credential|certification|trust/.test(f)) return "trust_method";
  if (/cta|offer|pricing|valueprop/.test(f)) return "decision_criterion";
  if (/audience|customerproblem/.test(f)) return "audience_problem";
  if (/comparison|attribute/.test(f)) return "comparison_attribute";
  return "product_category";
}

function inferSubjectLabel(
  candidate: ValidatedLlmTopicCandidate,
  context: ContentBrainContext
): string {
  const index = buildTopicEvidenceIndex(context);
  const cited = candidate.evidenceRefs
    .map((id) => index.itemsById[id])
    .filter(Boolean);
  const first = cited[0];
  if (first?.normalizedText?.trim()) {
    const text = first.normalizedText.trim();
    const words = text.split(/\s+/);
    if (words.length <= 8) return text;
    return words.slice(0, 8).join(" ");
  }
  const titleWords = candidate.title.trim().split(/\s+/).slice(0, 6);
  return titleWords.join(" ") || context.brandName;
}

const INTENT_STOPWORD_RE =
  /^(the|a|an|and|or|for|from|with|that|this|what|when|where|why|how|does|do|is|are|can|your|their|about|before|after|into|onto|over|under|between)$/i;

/**
 * Title-derived display-intent bucket. Distinct LLM angles on one subject
 * keep distinct buckets instead of collapsing into generic_label_check.
 */
function displayIntentHintFromTitle(title: string, subject: string): string {
  const subjectTokens = new Set(
    subject
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3)
  );
  const tokens = title
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(
      (t) =>
        t.length >= 4 && !INTENT_STOPWORD_RE.test(t) && !subjectTokens.has(t)
    );
  const hint = tokens.slice(0, 3).join("_");
  return hint ? `llm_${hint}` : "llm_candidate";
}

function seedFromLlmCandidate(
  candidate: ValidatedLlmTopicCandidate,
  context: ContentBrainContext,
  _objective: TopicCategoryId
): TopicSeed {
  void _objective;
  const index = buildTopicEvidenceIndex(context);
  const cited = candidate.evidenceRefs
    .map((id) => index.itemsById[id])
    .filter(Boolean);
  const subject = inferSubjectLabel(candidate, context);
  const sourceFields = [
    ...new Set(cited.map((c) => c.field).filter(Boolean)),
  ];
  const primaryField = cited[0]?.field ?? "context";
  const subjectType =
    cited.length > 0
      ? inferSubjectKind(cited[0]!.field)
      : ("product_category" as TopicSubjectKind);

  return {
    subject,
    subjectType,
    audienceNeed: candidate.audienceQuestion,
    evidenceIds: [...candidate.evidenceRefs],
    sourceFields: sourceFields.length ? sourceFields : [primaryField],
    classificationReason: `LLM candidate grounded in ${candidate.evidenceRefs.length} evidence ref(s)`,
    classificationConfidence:
      candidate.confidence != null && candidate.confidence >= 0.75
        ? "high"
        : candidate.confidence != null && candidate.confidence >= 0.5
          ? "medium"
          : "medium",
    frameHint: "llm_candidate",
    sourceType: "brand_observed",
    displayIntentHint: displayIntentHintFromTitle(candidate.title, subject),
  };
}

export function mapLlmCandidatesToFramed(args: {
  candidates: ValidatedLlmTopicCandidate[];
  context: ContentBrainContext;
  objective: TopicCategoryId;
}): LlmFramedCandidate[] {
  const { candidates, context, objective } = args;
  const out: LlmFramedCandidate[] = [];

  for (const candidate of candidates) {
    const seed = seedFromLlmCandidate(candidate, context, objective);
    out.push({
      title: candidate.title,
      strategicAngle: candidate.strategicAngle,
      relevanceReasons: [
        candidate.whyItFits,
        "Provenance: llm-generated from selected evidence",
      ].slice(0, 3),
      seed,
      objective,
      titleSource: "llm-generated",
      llmMeta: {
        hook: candidate.hook,
        audienceQuestion: candidate.audienceQuestion,
        whyItFits: candidate.whyItFits,
        suggestedFormats: candidate.suggestedFormats,
        platformFit: candidate.platformFit,
        funnelRole: candidate.funnelRole,
        confidence: candidate.confidence,
        itchType: candidate.itchType,
      },
    });
  }

  return out;
}
