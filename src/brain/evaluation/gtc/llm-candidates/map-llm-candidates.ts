import { dualSubjectFromLabel } from "@/brain/content/subject-shape";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";
import { pipelineTrace } from "@/brain/debug/pipeline-trace";

import { buildTopicEvidenceIndex } from "../../evidence";
import type { TopicEvidenceItem } from "../../evidence/types";
import type { TopicSeed } from "../../objective-topic-strategies";
import {
  analyzeMalformedSubject,
  logSubjectRejection,
} from "../../subjects/subject-rejection";
import {
  buildContextTokenIndex,
  sharesCatalogToken,
  significantTokens,
} from "../../subjects/context-tokens";
import { classifyContextSubjects } from "../../topic-subject";
import type { TopicSubject, TopicSubjectKind } from "../../topic-subject";
import type { FramedCandidate } from "../frame-title";
import { PREFERRED_KINDS } from "../preferred-kinds";
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

type MatchStrategy = "entity_match" | "first_segment" | "dropped";

type ResolvedLlmSubject = {
  label: string;
  kind: TopicSubjectKind;
  evidenceIds: string[];
  strategy: MatchStrategy;
  sourceField: string;
};

function inferSubjectKind(field: string): TopicSubjectKind {
  const f = field.toLowerCase();
  if (/faq|question/.test(f)) return "faq_topic";
  if (/indexedproduct|catalogproduct|product/.test(f)) return "catalog_product";
  // educationalTopics is marketing/heading copy — not an ingredient source.
  if (/ingredient|knowsabout|ownedtopic/.test(f)) {
    return "ingredient_or_component";
  }
  if (/testimonial|credential|certification|trust/.test(f)) return "trust_method";
  if (/cta|offer|pricing|valueprop/.test(f)) return "decision_criterion";
  if (/audience|customerproblem/.test(f)) return "audience_problem";
  if (/comparison|attribute/.test(f)) return "comparison_attribute";
  return "product_category";
}

function firstEvidenceSegment(text: string): string {
  const parts = text
    .split(/\s*[·|]\s*|\s+[—–]\s+|:/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[0] ?? text.trim();
}

function kindRank(kind: TopicSubjectKind, objective: TopicCategoryId): number {
  const pref = PREFERRED_KINDS[objective];
  const idx = pref.indexOf(kind);
  return idx === -1 ? 100 : idx;
}

function resolveLlmSubject(args: {
  candidate: ValidatedLlmTopicCandidate;
  context: ContentBrainContext;
  objective: TopicCategoryId;
  inventory: TopicSubject[];
  cited: TopicEvidenceItem[];
}): ResolvedLlmSubject | null {
  const { candidate, context, objective, inventory, cited } = args;
  const primaryField = cited[0]?.field ?? "context";
  const haystack = [
    candidate.title,
    candidate.strategicAngle,
    ...cited.map((c) => c.normalizedText),
  ].join(" ");
  const hayTokens = new Set(significantTokens(haystack));
  const catalogIndex = buildContextTokenIndex(context);

  let best: {
    subject: TopicSubject;
    overlap: number;
    kindRank: number;
    catalog: boolean;
  } | null = null;

  for (const subject of inventory) {
    const subTokens = significantTokens(subject.label);
    if (subTokens.length === 0) continue;
    let overlap = 0;
    for (const t of subTokens) {
      if (hayTokens.has(t)) overlap += 1;
    }
    // Also accept exact/substring label hits for short ingredient names.
    const labelLower = subject.label.toLowerCase();
    if (
      overlap === 0 &&
      labelLower.length >= 4 &&
      haystack.toLowerCase().includes(labelLower)
    ) {
      overlap = 1;
    }
    if (overlap < 1) continue;

    const catalog = sharesCatalogToken(subject.label, catalogIndex);
    const rank = kindRank(subject.kind, objective);
    if (
      !best ||
      overlap > best.overlap ||
      (overlap === best.overlap && catalog && !best.catalog) ||
      (overlap === best.overlap &&
        catalog === best.catalog &&
        rank < best.kindRank)
    ) {
      best = { subject, overlap, kindRank: rank, catalog };
    }
  }

  if (best) {
    const evidenceIds = [
      ...new Set([...best.subject.evidenceIds, ...candidate.evidenceRefs]),
    ];
    return {
      label: best.subject.label,
      kind: best.subject.kind,
      evidenceIds,
      strategy: "entity_match",
      sourceField: best.subject.sourceField || primaryField,
    };
  }

  const firstCited = cited[0]?.normalizedText?.trim();
  const fallback = firstCited
    ? firstEvidenceSegment(firstCited)
    : candidate.title.trim().split(/\s+/).slice(0, 6).join(" ") ||
      context.brandName;

  const analysis = analyzeMalformedSubject(fallback);
  if (analysis.malformed) {
    logSubjectRejection({
      candidate: fallback,
      reason: analysis.reason,
      repeatedHead: analysis.repeatedHead,
      itemCount: analysis.itemCount,
      sourceField: primaryField,
      company: context.domain,
    });
    pipelineTrace(
      "topic.llm_subject",
      {
        title: candidate.title,
        citedField: primaryField,
        resolved: fallback,
        strategy: "dropped",
        reason: analysis.reason,
      },
      "warn"
    );
    return null;
  }

  return {
    label: fallback,
    kind:
      cited.length > 0
        ? inferSubjectKind(cited[0]!.field)
        : ("product_category" as TopicSubjectKind),
    evidenceIds: [...candidate.evidenceRefs],
    strategy: "first_segment",
    sourceField: primaryField,
  };
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
  objective: TopicCategoryId,
  inventory: TopicSubject[]
): TopicSeed | null {
  const index = buildTopicEvidenceIndex(context);
  const cited = candidate.evidenceRefs
    .map((id) => index.itemsById[id])
    .filter(Boolean) as TopicEvidenceItem[];

  const resolved = resolveLlmSubject({
    candidate,
    context,
    objective,
    inventory,
    cited,
  });
  if (!resolved) return null;

  const dual = dualSubjectFromLabel(resolved.label);
  pipelineTrace("topic.llm_subject", {
    title: candidate.title,
    citedField: resolved.sourceField,
    resolved: dual.normalizedSubject,
    strategy: resolved.strategy,
    kind: resolved.kind,
  });

  return {
    subject: dual.normalizedSubject || dual.rawSubject,
    subjectType: resolved.kind,
    audienceNeed: candidate.audienceQuestion,
    evidenceIds: resolved.evidenceIds,
    sourceFields: [
      ...new Set(
        [
          resolved.sourceField,
          ...cited.map((c) => c.field).filter(Boolean),
        ].filter(Boolean)
      ),
    ],
    classificationReason: `LLM candidate grounded via ${resolved.strategy}`,
    classificationConfidence:
      candidate.confidence != null && candidate.confidence >= 0.75
        ? "high"
        : candidate.confidence != null && candidate.confidence >= 0.5
          ? "medium"
          : "medium",
    frameHint: "llm_candidate",
    sourceType: "brand_observed",
    displayIntentHint: displayIntentHintFromTitle(
      candidate.title,
      dual.normalizedSubject || dual.rawSubject
    ),
    rawSubject: dual.rawSubject,
    normalizedSubject: dual.normalizedSubject,
    subjectShape: dual.subjectShape,
  };
}

export function mapLlmCandidatesToFramed(args: {
  candidates: ValidatedLlmTopicCandidate[];
  context: ContentBrainContext;
  objective: TopicCategoryId;
}): LlmFramedCandidate[] {
  const { candidates, context, objective } = args;
  const inventory = classifyContextSubjects(context);
  const out: LlmFramedCandidate[] = [];

  for (const candidate of candidates) {
    const seed = seedFromLlmCandidate(
      candidate,
      context,
      objective,
      inventory
    );
    if (!seed) continue;
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

/** Test surface for subject resolution without going through framing. */
export const __mapLlmSubjectTestables = {
  resolveLlmSubject,
  inferSubjectKind,
  firstEvidenceSegment,
};
