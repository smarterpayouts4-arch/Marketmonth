import { selectedTopicContextSchema } from "@/brain/content/direction-writing-context";
import { validateExtraContext } from "@/brain/content/extra-context";
import { parseTopicCategory } from "@/brain/content/topic-category";
import { DIRECTIONS_PROVIDER_ID } from "@/brain/content/topic-generation-record";

import type {
  DirectionProviderChoice,
  GenerateAndRecordContentDirectionsInput,
  GenerateAndRecordContentDirectionsResult,
  ValidatedGenerateInput,
} from "./types";

export function validateGenerateInput(
  input: GenerateAndRecordContentDirectionsInput
):
  | { ok: false; result: GenerateAndRecordContentDirectionsResult }
  | { ok: true; value: ValidatedGenerateInput } {
  const domain = input.domain.trim();
  if (!domain) {
    return { ok: false, result: { ok: false, error: "domain is required", status: 400 } };
  }

  const mode = input.mode === "manual" ? "manual" : "automatic";
  const generationMode =
    input.generationMode ?? (mode === "manual" ? "manual" : "automatic");
  const directionsProvider: DirectionProviderChoice =
    input.directionsProvider === "intelligent-v1"
      ? "intelligent-v1"
      : DIRECTIONS_PROVIDER_ID;

  let selectedTopicContext = input.selectedTopicContext;
  if (input.selectedTopicContext) {
    const parsed = selectedTopicContextSchema.safeParse(
      input.selectedTopicContext
    );
    if (!parsed.success) {
      return {
        ok: false,
        result: {
          ok: false,
          error:
            parsed.error.issues[0]?.message ?? "Invalid selectedTopicContext",
          status: 400,
        },
      };
    }
    selectedTopicContext = parsed.data;
  }

  if (
    mode === "manual" &&
    generationMode !== "regenerate" &&
    generationMode !== "evaluation" &&
    !selectedTopicContext &&
    !input.topic?.trim()
  ) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "topic is required when mode is manual",
        status: 400,
      },
    };
  }

  if (
    mode === "manual" &&
    (generationMode === "evaluation" || generationMode === "manual") &&
    !selectedTopicContext &&
    !input.topic?.trim() &&
    !input.lockedMasterTopic?.trim()
  ) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "topic or selectedTopicContext is required",
        status: 400,
      },
    };
  }

  if (generationMode === "regenerate" && !input.lockedMasterTopic?.trim()) {
    return {
      ok: false,
      result: {
        ok: false,
        error: "lockedMasterTopic is required when regenerating ideas",
        status: 400,
      },
    };
  }

  if (input.priorities !== undefined) {
    if (
      !Array.isArray(input.priorities) ||
      input.priorities.some((p) => typeof p !== "string")
    ) {
      return {
        ok: false,
        result: {
          ok: false,
          error: "priorities must be an array of strings",
          status: 400,
        },
      };
    }
  }

  const focusParsed = parseTopicCategory(input.topicCategory);
  if (!focusParsed.ok) {
    return {
      ok: false,
      result: { ok: false, error: focusParsed.error, status: 400 },
    };
  }

  const extraValidated = validateExtraContext(input.extraContext);
  if (!extraValidated.ok) {
    return {
      ok: false,
      result: { ok: false, error: extraValidated.error, status: 400 },
    };
  }
  const extraContext =
    extraValidated.value.text.trim().length > 0
      ? extraValidated.value
      : undefined;

  return {
    ok: true,
    value: {
      domain,
      mode,
      generationMode,
      directionsProvider,
      selectedTopicContext,
      topic: input.topic,
      lockedMasterTopic: input.lockedMasterTopic,
      priorities: input.priorities,
      topicCategory: focusParsed.value ?? selectedTopicContext?.objective,
      extraContext,
      requestedVariations: input.requestedVariations ?? 6,
      parentGenerationId: input.parentGenerationId,
      runPurpose: input.runPurpose,
      comparisonGroupId: input.comparisonGroupId,
      experimentId: input.experimentId,
      fixturePath: input.fixturePath,
      repository: input.repository,
    },
  };
}
