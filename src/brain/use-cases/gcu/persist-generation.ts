import type { GenerateContentDirectionsBundle } from "@/brain/content/generate-content-directions";
import {
  buildInvalidTopicGenerationRecord,
  buildTopicGenerationRecord,
  findSimilarTopicNotice,
  type TopicGenerationMode,
  type TopicRunPurpose,
} from "@/brain/content/topic-generation-record";
import type { ContentDirectionResult } from "@/brain/content/types";
import type { BrandCoreIdentity } from "@/brain/core";
import type { TopicGenerationRepository } from "@/brain/store/topic-generation-repository";

import type { RecentSummary } from "./load-history";

export type PersistGenerationResult = {
  generationId: string | null;
  similarTopicNotice: string | null;
  historyPersisted: boolean;
  historyError: string | null;
};

function extractMasterReason(bundle: GenerateContentDirectionsBundle): string | undefined {
  if (
    typeof bundle.intelligentPayload === "object" &&
    bundle.intelligentPayload !== null &&
    "master_topic" in bundle.intelligentPayload &&
    typeof (bundle.intelligentPayload as { master_topic?: { reason_summary?: string } })
      .master_topic?.reason_summary === "string"
  ) {
    return (bundle.intelligentPayload as { master_topic: { reason_summary: string } })
      .master_topic.reason_summary;
  }
  return undefined;
}

export async function persistGenerationRecord(input: {
  result: ContentDirectionResult;
  bundle: GenerateContentDirectionsBundle;
  identity: BrandCoreIdentity;
  domain: string;
  generationMode: TopicGenerationMode;
  runPurpose?: TopicRunPurpose;
  parentGenerationId?: string;
  inputTopic?: string;
  comparisonGroupId?: string;
  experimentId?: string;
  recentSummaries: RecentSummary[];
  historyRepo: TopicGenerationRepository;
}): Promise<PersistGenerationResult> {
  const {
    result,
    bundle,
    identity,
    domain,
    generationMode,
    runPurpose,
    parentGenerationId,
    inputTopic,
    comparisonGroupId,
    experimentId,
    recentSummaries,
    historyRepo,
  } = input;

  let generationId: string | null = null;
  let similarTopicNotice: string | null = null;
  let historyPersisted = false;
  let historyError: string | null = null;

  const noveltyContext =
    generationMode === "automatic"
      ? {
          recent_generation_ids: recentSummaries.map((r) => r.generation_id),
          repeated_topic_allowed: false,
        }
      : undefined;

  const masterReason = extractMasterReason(bundle);

  if (result.status !== "blocked") {
    try {
      const record = buildTopicGenerationRecord({
        result,
        identity,
        domain,
        mode: generationMode,
        runPurpose: runPurpose ?? "product",
        parentGenerationId,
        inputTopic: inputTopic?.trim() || undefined,
        comparisonGroupId,
        experimentId,
        noveltyContext,
        provider: bundle.provenance.provider_id,
        brainVersion: bundle.provenance.brain_version,
        promptVersion: bundle.provenance.prompt_version ?? "none",
        model: bundle.provenance.model ?? undefined,
        masterTopicReason: masterReason,
        intelligentResult: bundle.intelligentPayload,
        validation: bundle.validation,
      });
      await historyRepo.create(record);
      generationId = record.generation_id;
      historyPersisted = true;
    } catch (err) {
      generationId = result.generationId;
      historyPersisted = false;
      historyError =
        err instanceof Error ? err.message : "Topic history persist failed";
    }

    if (
      (generationMode === "manual" || generationMode === "evaluation") &&
      inputTopic?.trim()
    ) {
      similarTopicNotice = findSimilarTopicNotice(
        inputTopic,
        recentSummaries.map((r) => ({
          generation_id: r.generation_id,
          master_topic: r.master_topic,
          status: r.status as "generated",
        }))
      );
    }
  } else if (
    bundle.invalidGenerationId &&
    bundle.masterTopicForHistory &&
    bundle.validation
  ) {
    try {
      const record = buildInvalidTopicGenerationRecord({
        generationId: bundle.invalidGenerationId,
        masterTopic: bundle.masterTopicForHistory,
        identity,
        domain,
        mode: generationMode,
        runPurpose: runPurpose ?? "product",
        parentGenerationId,
        inputTopic: inputTopic?.trim() || undefined,
        comparisonGroupId,
        experimentId,
        noveltyContext,
        provider: bundle.provenance.provider_id,
        brainVersion: bundle.provenance.brain_version,
        promptVersion: bundle.provenance.prompt_version,
        model: bundle.provenance.model,
        intelligentResult: bundle.intelligentPayload,
        validation: bundle.validation,
      });
      await historyRepo.create(record);
      generationId = record.generation_id;
      historyPersisted = true;
    } catch (err) {
      generationId = bundle.invalidGenerationId;
      historyPersisted = false;
      historyError =
        err instanceof Error ? err.message : "Invalid history persist failed";
    }
  }

  return {
    generationId,
    similarTopicNotice,
    historyPersisted,
    historyError,
  };
}
