import {
  compileBrandCore,
  resolveBrandCoreIdentity,
  toDirectionsBrandCoreSlice,
} from "@/brain/core";

import { withOwnerConfirmedContext } from "./extra-context";
import {
  assembleSuccessBundle,
  buildMasterTopicStage,
  readinessBlockedBundle,
  runProviderStage,
} from "./gcd";
import type { GenerateContentDirectionsBundle } from "./gcd";
import { assessReadiness } from "./readiness";
import type {
  ContentDirectionResult,
  GenerateContentDirectionsInput,
} from "./types";

export type { GenerateContentDirectionsBundle };

/**
 * Brain entrypoint: one master topic → six content directions.
 * Default provider: deterministic-v1. intelligent-v1 is opt-in.
 */
export async function generateContentDirections(
  input: GenerateContentDirectionsInput
): Promise<ContentDirectionResult> {
  const bundle = await generateContentDirectionsBundle(input);
  return bundle.result;
}

/** Full generation including experiment provenance / intelligent payload. */
export async function generateContentDirectionsBundle(
  input: GenerateContentDirectionsInput
): Promise<GenerateContentDirectionsBundle> {
  const mode = input.mode;
  const context = withOwnerConfirmedContext(
    input.context,
    input.extraContext ?? null
  );
  const readiness = assessReadiness(context);
  const providerId = input.directionsProvider ?? "deterministic-v1";
  const selectedTopicContext = input.selectedTopicContext;

  const readinessBlocked = readinessBlockedBundle({
    readiness,
    context,
    mode,
    providerId,
  });
  if (readinessBlocked) {
    return readinessBlocked;
  }

  const brandCore = compileBrandCore(context);
  const identity = resolveBrandCoreIdentity(brandCore);
  const brandSlice = toDirectionsBrandCoreSlice(brandCore, identity);

  const warnings = [...readiness.warnings];

  const masterStage = buildMasterTopicStage({
    context,
    mode,
    providerId,
    selectedTopicContext,
    lockedMasterTopic: input.lockedMasterTopic,
    topic: input.topic,
    recentMasterTopics: input.recentMasterTopics,
    topicCategory: input.topicCategory ?? selectedTopicContext?.objective,
    warnings,
  });
  if (!masterStage.ok) {
    return masterStage.bundle;
  }
  warnings.push(...masterStage.extraWarnings);

  const providerStage = await runProviderStage({
    brandSlice,
    context,
    mode,
    masterTopic: masterStage.masterTopic,
    topicCategory: input.topicCategory ?? selectedTopicContext?.objective,
    priorities: input.priorities,
    selectedTopicContext,
    providerId,
    requestSalt: input.requestSalt,
    warnings,
  });
  if (!providerStage.ok) {
    return providerStage.bundle;
  }

  return assembleSuccessBundle({
    context,
    mode,
    providerResult: providerStage.providerResult,
    masterTopic: providerStage.masterTopic,
    writingContext: providerStage.writingContext,
    selectedTopicContext,
    topicCategory: input.topicCategory,
    hookEnrichmentProvider: input.hookEnrichmentProvider,
    requestSalt: input.requestSalt,
    readiness,
    warnings: providerStage.warnings,
  });
}
