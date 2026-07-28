import type { BrandCoreIdentity } from "@/brain/core/brand-core-identity";

import { shortHash } from "./evidence";
import { normalizeInputTopic, topicsAreSimilar } from "./normalize-topic";
import {
  DIRECTIONS_BRAIN_VERSION,
  DIRECTIONS_PROMPT_VERSION,
  topicGenerationRecordSchema,
  type RecentHistorySummaryItem,
  type TopicGenerationDirection,
  type TopicGenerationMode,
  type TopicGenerationNoveltyContext,
  type TopicGenerationRecord,
  type TopicRunPurpose,
} from "./topic-generation-record.schema";
import type {
  ContentDirectionResult,
  ContentVariation,
  MasterTopic,
} from "./types";

export {
  DIRECTIONS_BRAIN_VERSION,
  DIRECTIONS_PROMPT_VERSION,
  DIRECTIONS_PROVIDER_ID,
  RECENT_HISTORY_LIMIT,
  topicGenerationRecordSchema,
  type TopicGenerationDirection,
  type TopicGenerationEvaluation,
  type TopicGenerationMode,
  type TopicGenerationNoveltyContext,
  type TopicGenerationRecord,
  type TopicGenerationRecordStatus,
  type TopicRunPurpose,
  type RecentHistorySummaryItem,
} from "./topic-generation-record.schema";

export { normalizeInputTopic, topicsAreSimilar } from "./normalize-topic";

/** @deprecated Use TopicGenerationMode — kept for route body mapping. */
export type GenerationReason = "manual" | "automatic" | "regenerate";

export function directionFromVariation(
  variation: ContentVariation,
  position: number
): TopicGenerationDirection {
  const specific =
    variation.specificTopic?.trim() || variation.punchline.trim();
  const summary =
    variation.ideaSummary?.trim() ||
    expandIdeaSummary(variation);
  return {
    direction_id: variation.id,
    position,
    specific_topic: specific,
    idea_summary: summary.slice(0, 600),
    editorial_angle: variation.angle,
    audience_problem: variation.audienceProblem?.trim() || "",
    core_promise: variation.corePromise?.trim() || variation.brief.trim(),
    suggested_creative_mode: variation.suggestedFormat?.trim() || "narrative",
    evidence_ids: variation.evidenceIds,
    claim_ids: variation.claimIds,
    audience_problem_ids: variation.audienceProblemIds,
    differentiation_summary: variation.differentiationSummary,
    confidence: variation.confidence,
    safety_flags: variation.safety.reasons,
  };
}

function expandIdeaSummary(variation: ContentVariation): string {
  const parts = [
    variation.brief?.trim(),
    variation.audienceProblem?.trim()
      ? `Audience problem: ${variation.audienceProblem.trim()}`
      : "",
    variation.corePromise?.trim()
      ? `Promise: ${variation.corePromise.trim()}`
      : "",
    variation.strategicPurpose?.trim()
      ? `Purpose: ${variation.strategicPurpose.trim()}`
      : "",
  ].filter(Boolean);
  let text = parts.join(" ");
  if (text.length < 180) {
    text = `${text} This direction stays concrete under the master topic and is ready for a single Content Atom after selection.`.trim();
  }
  return text.slice(0, 600);
}

export type BuildTopicGenerationRecordArgs = {
  identity: BrandCoreIdentity;
  domain: string;
  mode: TopicGenerationMode;
  runPurpose?: TopicRunPurpose;
  parentGenerationId?: string;
  inputTopic?: string;
  comparisonGroupId?: string;
  experimentId?: string;
  noveltyContext?: TopicGenerationNoveltyContext;
  provider: string;
  brainVersion: string;
  promptVersion: string;
  model?: string | null;
  generationCodeVersion?: string;
  masterTopic: string;
  masterTopicReason?: string;
  directions: TopicGenerationDirection[];
  generationId: string;
  status: "generated" | "invalid";
  intelligentResult?: unknown;
  validation?: {
    validator_version: string;
    ok: boolean;
    errors: string[];
  };
};

export function buildTopicGenerationRecordFromParts(
  args: BuildTopicGenerationRecordArgs
): TopicGenerationRecord {
  const now = new Date().toISOString();
  const input = args.inputTopic?.trim();
  const record: TopicGenerationRecord = {
    generation_id: args.generationId,
    company_id: args.identity.company_id,
    domain: args.domain,
    brand_core_id: args.identity.brand_core_id,
    brand_core_version: args.identity.brand_core_version,
    brand_core_hash: args.identity.brand_core_hash,
    mode: args.mode,
    run_purpose: args.runPurpose ?? "product",
    input_topic: input,
    normalized_input_topic: input
      ? normalizeInputTopic(input)
      : normalizeInputTopic(args.masterTopic),
    master_topic: args.masterTopic,
    master_topic_reason: args.masterTopicReason,
    directions: args.directions,
    parent_generation_id: args.parentGenerationId,
    comparison_group_id: args.comparisonGroupId,
    experiment_id: args.experimentId,
    status: args.status,
    generation_provenance: {
      brain_version: args.brainVersion,
      prompt_version: args.promptVersion || "none",
      provider: args.provider,
      model: args.model ?? undefined,
      generation_code_version: args.generationCodeVersion,
    },
    novelty_context: args.noveltyContext,
    intelligent_result: args.intelligentResult,
    validation: args.validation,
    record_revision: 1,
    created_at: now,
    updated_at: now,
  };
  return topicGenerationRecordSchema.parse(record);
}

export function buildTopicGenerationRecord(args: {
  result: Extract<
    ContentDirectionResult,
    { status: "ready" | "partially_ready" }
  >;
  identity: BrandCoreIdentity;
  domain: string;
  mode: TopicGenerationMode;
  runPurpose?: TopicRunPurpose;
  parentGenerationId?: string;
  inputTopic?: string;
  comparisonGroupId?: string;
  experimentId?: string;
  noveltyContext?: TopicGenerationNoveltyContext;
  provider: string;
  model?: string;
  generationCodeVersion?: string;
  brainVersion?: string;
  promptVersion?: string;
  masterTopicReason?: string;
  intelligentResult?: unknown;
  validation?: {
    validator_version: string;
    ok: boolean;
    errors: string[];
  };
}): TopicGenerationRecord {
  return buildTopicGenerationRecordFromParts({
    identity: args.identity,
    domain: args.domain,
    mode: args.mode,
    runPurpose: args.runPurpose,
    parentGenerationId: args.parentGenerationId,
    inputTopic: args.inputTopic,
    comparisonGroupId: args.comparisonGroupId,
    experimentId: args.experimentId,
    noveltyContext: args.noveltyContext,
    provider: args.provider,
    brainVersion: args.brainVersion ?? DIRECTIONS_BRAIN_VERSION,
    promptVersion: args.promptVersion ?? DIRECTIONS_PROMPT_VERSION,
    model: args.model,
    generationCodeVersion: args.generationCodeVersion,
    masterTopic: args.result.masterTopic.punchline,
    masterTopicReason: args.masterTopicReason,
    directions: args.result.variations.map((v, i) =>
      directionFromVariation(v, i + 1)
    ),
    generationId: args.result.generationId,
    status: "generated",
    intelligentResult: args.intelligentResult,
    validation: args.validation,
  });
}

export function buildInvalidTopicGenerationRecord(args: {
  generationId: string;
  masterTopic: MasterTopic;
  identity: BrandCoreIdentity;
  domain: string;
  mode: TopicGenerationMode;
  runPurpose?: TopicRunPurpose;
  parentGenerationId?: string;
  inputTopic?: string;
  comparisonGroupId?: string;
  experimentId?: string;
  noveltyContext?: TopicGenerationNoveltyContext;
  provider: string;
  brainVersion: string;
  promptVersion: string | null;
  model?: string | null;
  intelligentResult?: unknown;
  validation?: {
    validator_version: string;
    ok: boolean;
    errors: string[];
  };
}): TopicGenerationRecord {
  const reason =
    typeof args.intelligentResult === "object" &&
    args.intelligentResult !== null &&
    "master_topic" in args.intelligentResult &&
    typeof (args.intelligentResult as { master_topic?: { reason_summary?: string } })
      .master_topic?.reason_summary === "string"
      ? (args.intelligentResult as { master_topic: { reason_summary: string } })
          .master_topic.reason_summary
      : undefined;

  return buildTopicGenerationRecordFromParts({
    identity: args.identity,
    domain: args.domain,
    mode: args.mode,
    runPurpose: args.runPurpose,
    parentGenerationId: args.parentGenerationId,
    inputTopic: args.inputTopic,
    comparisonGroupId: args.comparisonGroupId,
    experimentId: args.experimentId,
    noveltyContext: args.noveltyContext,
    provider: args.provider,
    brainVersion: args.brainVersion,
    promptVersion: args.promptVersion ?? "none",
    model: args.model,
    masterTopic: args.masterTopic.punchline,
    masterTopicReason: reason,
    directions: [],
    generationId: args.generationId,
    status: "invalid",
    intelligentResult: args.intelligentResult,
    validation: args.validation,
  });
}

export function findSimilarTopicNotice(
  topic: string,
  recent: RecentHistorySummaryItem[]
): string | null {
  const hit = recent.find((r) => topicsAreSimilar(topic, r.master_topic));
  if (!hit) return null;
  return "A similar topic was generated recently.";
}

export function newGenerationId(seed: string): string {
  return `tgen_${shortHash(seed)}`;
}
