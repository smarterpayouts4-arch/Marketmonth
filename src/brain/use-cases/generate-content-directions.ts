import { generateContentDirectionsBundle } from "@/brain/content/generate-content-directions";
import { createRunContext } from "@/brain/observability/trace-recorder";

import {
  createHistoryRepository,
  loadBrandContext,
  loadRecentHistory,
  persistGenerationRecord,
  validateGenerateInput,
} from "./gcu";
import type {
  GenerateAndRecordContentDirectionsInput,
  GenerateAndRecordContentDirectionsResult,
} from "./gcu";

export type {
  DirectionProviderChoice,
  GenerateAndRecordContentDirectionsInput,
  GenerateAndRecordContentDirectionsResult,
} from "./gcu";

/**
 * Brain use case: load company source → compile Brand Core → generate directions
 * → validate → append history record. Routes/scripts must call this, not compose
 * those steps themselves.
 */
export async function generateAndRecordContentDirections(
  input: GenerateAndRecordContentDirectionsInput
): Promise<GenerateAndRecordContentDirectionsResult> {
  const validated = validateGenerateInput(input);
  if (!validated.ok) {
    return validated.result;
  }
  const v = validated.value;

  const run = createRunContext({
    workflowVersion: "generate-and-record-directions-v1",
    inputSummary: `domain=${v.domain};provider=${v.directionsProvider}`,
  });
  run.trace.stageStarted("load_brand_context");

  let context: import("@/brain/content/types").ContentBrainContext;
  let identity: import("@/brain/core").BrandCoreIdentity;
  if (input.preloaded) {
    context = input.preloaded.context;
    identity = input.preloaded.identity;
    run.trace.stageCompleted("load_brand_context", "success", {
      summary: "preloaded",
    });
  } else {
    const loaded = await loadBrandContext({
      domain: v.domain,
      fixturePath: v.fixturePath,
    });
    if (!loaded.ok) {
      const errMsg =
        loaded.result.ok === false ? loaded.result.error : "load failed";
      run.trace.validationFailed("load_brand_context", errMsg);
      return loaded.result;
    }
    context = loaded.value.context;
    identity = loaded.value.identity;
    run.trace.stageCompleted("load_brand_context", "success");
  }
  run.brandCoreId = identity.brand_core_id;
  run.brandCoreHash = identity.brand_core_hash;

  const historyRepo = createHistoryRepository(v.repository);
  run.trace.stageStarted("load_history");
  const recentSummaries = await loadRecentHistory({
    companyId: identity.company_id,
    repository: historyRepo,
  });
  run.trace.stageCompleted("load_history", "success", {
    summary: `recent=${recentSummaries.length}`,
  });

  const recentMasterTopics = recentSummaries.map((r) => r.master_topic);
  const requestSalt = `${v.generationMode}|${v.parentGenerationId ?? ""}|${Date.now()}`;

  run.trace.stageStarted("generate_directions", {
    provider: v.directionsProvider,
  });
  const bundle = await generateContentDirectionsBundle({
    context,
    mode: v.mode,
    topic: v.selectedTopicContext
      ? v.selectedTopicContext.masterTitle
      : v.topic,
    lockedMasterTopic:
      v.generationMode === "regenerate" ? v.lockedMasterTopic : undefined,
    recentMasterTopics:
      v.mode === "automatic" && v.generationMode === "automatic"
        ? recentMasterTopics
        : undefined,
    marketingFocus: v.marketingFocus ?? v.selectedTopicContext?.objective,
    priorities: v.priorities,
    extraContext: v.extraContext,
    requestedVariations: v.requestedVariations,
    requestSalt,
    directionsProvider: v.directionsProvider,
    selectedTopicContext: v.selectedTopicContext,
  });
  run.trace.modelCalled("generate_directions", v.directionsProvider);
  run.trace.stageCompleted(
    "generate_directions",
    bundle.result.status === "blocked" ? "warning" : "success",
    { summary: `status=${bundle.result.status}` }
  );

  const result = bundle.result;
  run.trace.stageStarted("persist_history");
  const persisted = await persistGenerationRecord({
    result,
    bundle,
    identity,
    domain: context.domain,
    generationMode: v.generationMode,
    runPurpose: v.runPurpose,
    parentGenerationId: v.parentGenerationId,
    inputTopic: v.topic,
    comparisonGroupId: v.comparisonGroupId,
    experimentId: v.experimentId,
    recentSummaries,
    historyRepo,
  });
  run.trace.stageCompleted(
    "persist_history",
    persisted.historyPersisted ? "success" : "warning",
    {
      summary: persisted.historyError ?? "ok",
      errorClass: persisted.historyPersisted ? undefined : "history_write",
    }
  );

  if (bundle.validation) {
    run.trace.setValidationStatus(bundle.validation.ok ? "pass" : "fail");
  }

  const finalStatus =
    result.status === "blocked"
      ? "blocked"
      : persisted.historyPersisted
        ? "success"
        : "needs_review";
  const runTrace = run.trace.build(finalStatus, run);

  return {
    ok: true,
    result,
    generationId: persisted.generationId,
    brandCoreId: identity.brand_core_id,
    brandCoreVersion: identity.brand_core_version,
    brandCoreHash: identity.brand_core_hash,
    similarTopicNotice: persisted.similarTopicNotice,
    noveltyRecentCount: recentSummaries.length,
    generationMode: v.generationMode,
    provider: v.directionsProvider,
    source: context.source,
    historyPersisted: persisted.historyPersisted,
    historyError: persisted.historyError,
    validationOk: bundle.validation ? bundle.validation.ok : null,
    writingContext: bundle.writingContext,
    selectedTopicContext: bundle.selectedTopicContext,
    runTrace,
  };
}
