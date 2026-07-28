import { buildDirectionWritingContext, type DirectionWritingContext, type SelectedTopicContext } from "../direction-writing-context";
import { shortHash } from "../evidence";
import { selectDirectionsProvider } from "@/brain/policy/provider-policy";
import type { DirectionsBrandCoreSlice } from "@/brain/core";

import type { DirectionProviderId } from "../providers/types";
import type { DirectionsProviderResult } from "../providers/types";
import type { ContentBrainContext, GenerateContentDirectionsInput, MasterTopic } from "../types";
import { REQUIRED_VARIATION_COUNT } from "../types";
import type { GenerateContentDirectionsBundle } from "./types";

export type ProviderStageResult =
  | {
      ok: true;
      providerResult: DirectionsProviderResult;
      writingContext: DirectionWritingContext;
      masterTopic: MasterTopic;
      warnings: string[];
    }
  | { ok: false; bundle: GenerateContentDirectionsBundle };

export async function runProviderStage(input: {
  brandSlice: DirectionsBrandCoreSlice;
  context: ContentBrainContext;
  mode: GenerateContentDirectionsInput["mode"];
  masterTopic: MasterTopic;
  marketingFocus?: GenerateContentDirectionsInput["marketingFocus"];
  priorities?: string[];
  selectedTopicContext?: SelectedTopicContext;
  providerId: DirectionProviderId;
  requestSalt?: string;
  warnings: string[];
}): Promise<ProviderStageResult> {
  const {
    brandSlice,
    context,
    mode,
    masterTopic,
    marketingFocus,
    priorities,
    selectedTopicContext,
    providerId,
    requestSalt,
    warnings,
  } = input;

  const writingContext = buildDirectionWritingContext({
    selected: selectedTopicContext ?? null,
    context,
    fallbackMasterTitle: masterTopic.punchline,
    fallbackObjective: marketingFocus ?? selectedTopicContext?.objective,
  });

  const provider = selectDirectionsProvider(providerId);
  const providerResult = await provider.generateDirections({
    brandSlice,
    context,
    mode,
    masterTopic,
    marketingFocus:
      marketingFocus ?? selectedTopicContext?.objective ?? writingContext.objective,
    priorities,
    selectedTopicContext: selectedTopicContext ?? undefined,
    writingContext,
  });

  if (providerResult.invalid) {
    const invalidGenerationId = `tgen_${shortHash(
      `invalid|${providerId}|${masterTopic.punchline}|${context.contextVersion}|${requestSalt ?? ""}|${Date.now()}`
    )}`;
    return {
      ok: false,
      bundle: {
        result: {
          status: "blocked",
          brandName: context.brandName,
          mode,
          missingFields: [],
          warnings: [
            ...warnings,
            ...(providerResult.validation?.errors ?? [
              "Provider returned invalid generation",
            ]),
          ],
          variations: [],
        },
        provenance: providerResult.provenance,
        intelligentPayload: providerResult.intelligentPayload,
        validation: providerResult.validation,
        invalidGenerationId,
        masterTopicForHistory: masterTopic,
      },
    };
  }

  const variations = providerResult.variations;
  if (variations.length !== REQUIRED_VARIATION_COUNT) {
    return {
      ok: false,
      bundle: {
        result: {
          status: "blocked",
          brandName: context.brandName,
          mode,
          missingFields: ["variations"],
          warnings: [
            ...warnings,
            `Expected ${REQUIRED_VARIATION_COUNT} variations, got ${variations.length}`,
          ],
          variations: [],
        },
        provenance: providerResult.provenance,
        intelligentPayload: providerResult.intelligentPayload,
        validation: providerResult.validation,
      },
    };
  }

  const blockedVars = variations.filter((v) => v.safety.status === "blocked");
  if (blockedVars.length > 0) {
    return {
      ok: false,
      bundle: {
        result: {
          status: "blocked",
          brandName: context.brandName,
          mode,
          missingFields: [],
          warnings: [
            ...warnings,
            `${blockedVars.length} variation(s) failed safety`,
          ],
          variations: [],
        },
        provenance: providerResult.provenance,
        intelligentPayload: providerResult.intelligentPayload,
        validation: providerResult.validation,
      },
    };
  }

  return {
    ok: true,
    providerResult,
    writingContext,
    masterTopic,
    warnings,
  };
}
