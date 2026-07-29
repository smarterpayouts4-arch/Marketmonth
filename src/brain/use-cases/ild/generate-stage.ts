import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { ContentBrainContext } from "@/brain/content/types";
import type { BrandCore, BrandCoreIdentity } from "@/brain/core";
import {
  endTimer,
  skipRemaining,
  startTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import {
  IDEA_LAB_GENERATOR_VERSION,
  IDEA_LAB_PROVIDER_ID,
} from "@/brain/evaluation/idea-lab.types";
import type { IdeaLabRun } from "@/brain/evaluation/idea-lab.types";
import { createTopicGenerationRepository } from "@/brain/store/create-topic-generation-repository";
import {
  generateAndRecordContentDirections,
  type GenerateAndRecordContentDirectionsResult,
} from "@/brain/use-cases/generate-content-directions";

import { finalizeFailedRun } from "./finalize-failed";
import type { RunTimer, TraceDrafts } from "./types";

const PUBLIC_MODULE = "src/brain/use-cases/run-idea-lab-directions.ts";

export type GenerateStageOk = {
  outcome: Extract<GenerateAndRecordContentDirectionsResult, { ok: true }>;
  generationSucceeded: boolean;
  warnings: string[];
};

export type GenerateStageResult =
  | { ok: true; value: GenerateStageOk }
  | { ok: false; run: IdeaLabRun };

export async function runIdeaLabGenerateStage(args: {
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  selectedTopicContext: SelectedTopicContext;
  topicCategory: TopicCategoryId;
  selectedCandidateId?: string;
  fixturePath: string;
  hash: string;
  historyRepositoryPath: string;
  runId: string;
  runStarted: RunTimer;
  drafts: TraceDrafts;
  labHistoryRecordCountBefore: number;
}): Promise<GenerateStageResult> {
  const {
    context,
    brandCore,
    identity,
    selectedTopicContext,
    topicCategory,
    selectedCandidateId,
    fixturePath,
    hash,
    historyRepositoryPath,
    runId,
    runStarted,
    drafts,
    labHistoryRecordCountBefore,
  } = args;

  const tGen = startTimer();
  const labRepo = createTopicGenerationRepository({
    filePath: historyRepositoryPath,
  });

  drafts.push({
    stage: "Selected topic locked",
    modulePath: PUBLIC_MODULE,
    status: "success",
    durationMs: null,
    outputSummary: {
      selectedTopic: selectedTopicContext.masterTitle,
      topicCategory,
      selectedCandidateId: selectedTopicContext.topicId,
      framingStrategyHint: selectedTopicContext.objective,
    },
  });

  const outcome = await generateAndRecordContentDirections({
    domain: context.domain || identity.company_id,
    mode: "manual",
    topic: selectedTopicContext.masterTitle,
    topicCategory,
    fixturePath,
    repository: labRepo,
    directionsProvider: IDEA_LAB_PROVIDER_ID,
    generationMode: "evaluation",
    runPurpose: "benchmark",
    selectedTopicContext,
    preloaded: { context, identity },
  });

  const genEnd = endTimer(tGen);

  if (!outcome.ok) {
    drafts.push({
      stage: "Directions provider resolved",
      modulePath: "src/brain/content/providers/resolve-provider.ts",
      symbol: "resolveProvider",
      status: "error",
      ...genEnd,
      warnings: [outcome.error],
    });
    drafts.push(...skipRemaining(7, outcome.error));
    return {
      ok: false,
      run: await finalizeFailedRun({
        runId,
        runStarted,
        drafts,
        historyRepositoryPath,
        labHistoryRecordCountBefore,
        errors: [outcome.error],
        fixtureHash: hash,
        context,
        identity,
        brandCore,
        topicMode: "manual",
      }),
    };
  }

  drafts.push({
    stage: "Directions provider resolved",
    modulePath: "src/brain/content/providers/resolve-provider.ts",
    symbol: "resolveProvider",
    status: "success",
    durationMs: null,
    outputSummary: {
      providerRequested: IDEA_LAB_PROVIDER_ID,
      providerUsed: IDEA_LAB_PROVIDER_ID,
      generatorVersion: IDEA_LAB_GENERATOR_VERSION,
      model: null,
      promptVersion: null,
    },
  });

  const result = outcome.result;
  const generationSucceeded = result.status !== "blocked";
  const warnings = [...result.warnings];
  if (!outcome.historyPersisted) {
    warnings.push(
      outcome.historyError
        ? `Ideas generated path completed but Lab history was not persisted: ${outcome.historyError}`
        : "Ideas may be available, but the run was not persisted to Lab history."
    );
  }

  if (result.status === "blocked") {
    drafts.push({
      stage: "Master topic generated",
      modulePath: "src/brain/content/generate-content-directions.ts",
      status: "error",
      ...genEnd,
      warnings: result.warnings,
    });
    drafts.push({
      stage: "Six ideas generated",
      modulePath: "src/brain/content/providers/deterministic-provider.ts",
      status: "error",
      durationMs: null,
      warnings: ["Blocked — no variations"],
    });
    drafts.push({
      stage: "Output validated",
      modulePath: "src/brain/content/generate-content-directions.ts",
      status: "error",
      durationMs: null,
      outputSummary: { status: "blocked", missingFields: result.missingFields },
    });
  } else {
    drafts.push({
      stage: "Master topic generated",
      modulePath: "src/brain/content/generate-content-directions.ts",
      symbol: "manual/locked master from selected topic",
      status: "success",
      durationMs: null,
      outputSummary: {
        masterTopic: result.masterTopic.punchline,
        source: result.masterTopic.source,
        topicCategory,
        selectedCandidateId: selectedCandidateId ?? null,
      },
      warnings: [
        "Rationale not currently exposed by generator beyond masterTopic.rationale field when present.",
      ],
    });
    drafts.push({
      stage: "Six ideas generated",
      modulePath: "src/brain/content/providers/deterministic-provider.ts",
      symbol: "generateDirections",
      status: result.variations.length === 6 ? "success" : "warning",
      ...genEnd,
      outputSummary: {
        count: result.variations.length,
        ids: result.variations.map((v) => v.id),
      },
    });
    drafts.push({
      stage: "Output validated",
      modulePath: "src/brain/use-cases/generate-content-directions.ts",
      symbol: "generateAndRecordContentDirections",
      status: "success",
      durationMs: null,
      outputSummary: {
        resultStatus: result.status,
        generationId: outcome.generationId,
        historyPersisted: outcome.historyPersisted,
        historyRepositoryPath,
      },
    });
  }

  return {
    ok: true,
    value: { outcome, generationSucceeded, warnings },
  };
}
