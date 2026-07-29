import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { ContentBrainContext } from "@/brain/content/types";
import type { BrandCore, BrandCoreIdentity } from "@/brain/core";
import {
  buildTrace,
  endTimer,
} from "@/brain/evaluation/build-idea-lab-trace";
import { appendIdeaLabRun } from "@/brain/evaluation/idea-lab-store";
import type {
  IdeaLabDirectionLineage,
  IdeaLabRun,
} from "@/brain/evaluation/idea-lab.types";
import {
  IDEA_LAB_FIXTURE_NAME,
  IDEA_LAB_GENERATOR_VERSION,
  IDEA_LAB_PROVIDER_ID,
  IDEA_LAB_WRITING_CONTEXT_VERSION,
} from "@/brain/evaluation/idea-lab.types";
import type { GenerateAndRecordContentDirectionsResult } from "@/brain/use-cases/generate-content-directions";

import { buildInfluence, toIdeaView } from "./views";
import type { RunTimer, TraceDrafts } from "./types";

export async function buildAndPersistSuccessRun(args: {
  runId: string;
  runStarted: RunTimer;
  drafts: TraceDrafts;
  hash: string;
  context: ContentBrainContext;
  brandCore: BrandCore;
  identity: BrandCoreIdentity;
  evidenceCount: number;
  selectedTopicContext: SelectedTopicContext;
  historyRepositoryPath: string;
  labHistoryRecordCountBefore: number;
  outcome: Extract<GenerateAndRecordContentDirectionsResult, { ok: true }>;
  generationSucceeded: boolean;
  warnings: string[];
}): Promise<IdeaLabRun> {
  const {
    runId,
    runStarted,
    drafts,
    hash,
    context,
    brandCore,
    identity,
    evidenceCount,
    selectedTopicContext,
    historyRepositoryPath,
    labHistoryRecordCountBefore,
    outcome,
    generationSucceeded,
    warnings,
  } = args;

  const result = outcome.result;
  const ideas =
    result.status === "blocked" ? [] : result.variations.map(toIdeaView);
  const masterTopic =
    result.status === "blocked" ? "" : selectedTopicContext.masterTitle;
  const masterRationale =
    result.status === "blocked"
      ? null
      : result.masterTopic.rationale?.trim() || null;

  const influence = buildInfluence({
    brandName: context.brandName,
    website: context.website,
    products: context.products,
    services: context.services,
    audience: context.audience,
    positioning: brandCore.positioning,
    offers: brandCore.offers,
    contentOpportunities: context.contentOpportunities,
    proofCount: brandCore.proof_library.length,
    evidenceCount,
  });

  const completed = endTimer(runStarted);
  let directionLineage: IdeaLabDirectionLineage | undefined;
  if (
    generationSucceeded &&
    outcome.writingContext &&
    selectedTopicContext
  ) {
    directionLineage = {
      selectedTopicId: selectedTopicContext.topicId,
      selectedMasterTitle: selectedTopicContext.masterTitle,
      objective: selectedTopicContext.objective,
      framingStrategy: outcome.writingContext.framingStrategy,
      fixtureHash: hash,
      brandCoreId: identity.brand_core_id,
      writingContextVersion: IDEA_LAB_WRITING_CONTEXT_VERSION,
      directionWritingContext: outcome.writingContext,
      providerUsed: IDEA_LAB_PROVIDER_ID,
      generatorVersion: IDEA_LAB_GENERATOR_VERSION,
      createdAt: completed.completedAt,
    };
  }

  const run: IdeaLabRun = {
    runId,
    startedAt: completed.startedAt,
    completedAt: completed.completedAt,
    durationMs: completed.durationMs,
    input: {
      fixtureName: IDEA_LAB_FIXTURE_NAME,
      fixtureHash: hash,
      providerRequested: IDEA_LAB_PROVIDER_ID,
      providerUsed: IDEA_LAB_PROVIDER_ID,
      generatorVersion: IDEA_LAB_GENERATOR_VERSION,
      writingContextVersion: IDEA_LAB_WRITING_CONTEXT_VERSION,
      model: null,
      promptVersion: null,
      topicMode: "manual",
      manualTopic: selectedTopicContext.masterTitle,
      historyRepositoryPath,
      labHistoryRecordCountBefore,
    },
    directionLineage,
    contextSummary: {
      brandName: context.brandName,
      website: context.website,
      products: context.products,
      services: context.services,
      audiences: context.audience ? [context.audience] : [],
      contentOpportunities: context.contentOpportunities,
      evidenceCount,
    },
    brandCoreSummary: {
      brandCoreId: identity.brand_core_id,
      brandCoreVersion: identity.brand_core_version,
      brandCoreHash: identity.brand_core_hash,
      positioningSummary: brandCore.positioning,
      offers: brandCore.offers,
      audiences: context.audience ? [context.audience] : [],
      proofCount: brandCore.proof_library.length,
      usedAsPrimaryIdeaInput: true,
    },
    generation: {
      masterTopic,
      masterTopicRationale: masterRationale,
      rationaleNote: masterRationale
        ? "Exposed via masterTopic.rationale from deterministic builder"
        : "Rationale not currently exposed by generator.",
      ideas,
    },
    influence,
    trace: buildTrace(drafts),
    generationSucceeded,
    historyPersisted: outcome.historyPersisted,
    persistenceError: outcome.historyError,
    historyWarning: outcome.historyPersisted
      ? null
      : "Ideas generated successfully, but the run was not persisted.",
    warnings,
    errors: generationSucceeded ? [] : [...result.warnings],
  };

  await appendIdeaLabRun(run);
  return run;
}
