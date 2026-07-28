import { applyDirectionHookEnrichment } from "../apply-direction-hook-enrichment";
import type { DirectionWritingContext, SelectedTopicContext } from "../direction-writing-context";
import { shortHash } from "../evidence";
import type { DirectionsProviderResult } from "../providers/types";
import type { ReadinessAssessment } from "../readiness";
import type { ContentBrainContext, GenerateContentDirectionsInput, MasterTopic } from "../types";
import type { GenerateContentDirectionsBundle } from "./types";

export async function assembleSuccessBundle(input: {
  context: ContentBrainContext;
  mode: GenerateContentDirectionsInput["mode"];
  providerResult: DirectionsProviderResult;
  masterTopic: MasterTopic;
  writingContext: DirectionWritingContext;
  selectedTopicContext?: SelectedTopicContext;
  marketingFocus?: GenerateContentDirectionsInput["marketingFocus"];
  hookEnrichmentProvider?: GenerateContentDirectionsInput["hookEnrichmentProvider"];
  requestSalt?: string;
  readiness: ReadinessAssessment;
  warnings: string[];
}): Promise<GenerateContentDirectionsBundle> {
  const {
    context,
    mode,
    providerResult,
    writingContext,
    selectedTopicContext,
    marketingFocus,
    hookEnrichmentProvider,
    requestSalt,
    readiness,
    warnings,
  } = input;

  const finalMaster = providerResult.masterTopic;
  const lockedMasterTitle = finalMaster.punchline;

  const six = providerResult.variations as [
    (typeof providerResult.variations)[number],
    (typeof providerResult.variations)[number],
    (typeof providerResult.variations)[number],
    (typeof providerResult.variations)[number],
    (typeof providerResult.variations)[number],
    (typeof providerResult.variations)[number],
  ];

  const enriched = await applyDirectionHookEnrichment({
    variations: six,
    lockedMasterTitle,
    objective:
      marketingFocus ??
      selectedTopicContext?.objective ??
      writingContext.objective,
    context,
    selectedTopicContext: selectedTopicContext ?? undefined,
    provider: hookEnrichmentProvider ?? "auto",
  });

  const finalVariations =
    enriched.masterTitle === lockedMasterTitle ? enriched.variations : six;
  const generationId = `tgen_${shortHash(
    `${finalMaster.id}|${finalVariations.map((v) => v.id).join(",")}|${context.contextVersion}|${requestSalt ?? ""}|${Date.now()}`
  )}`;

  const status =
    readiness.status === "ready" && warnings.length === 0
      ? "ready"
      : "partially_ready";

  const masterTopicOut = {
    ...finalMaster,
    punchline: lockedMasterTitle,
  };

  return {
    result: {
      status,
      brandName: context.brandName,
      generatedAt: new Date().toISOString(),
      contextVersion: context.contextVersion,
      generationId,
      mode,
      masterTopic: masterTopicOut,
      variations: finalVariations,
      warnings,
    },
    provenance: providerResult.provenance,
    intelligentPayload: providerResult.intelligentPayload,
    validation: providerResult.validation,
    writingContext,
    selectedTopicContext: selectedTopicContext ?? undefined,
    hookEnrichment: enriched.meta,
  };
}
