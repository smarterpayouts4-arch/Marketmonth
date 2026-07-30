import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { GenerationReason } from "@/brain/content/topic-generation-record";
import type { ExtraContextInput } from "@/brain/content/types";

import {
  buildExtraContextPayload,
  canSubmitWithContext,
  type ExtraContextUiState,
} from "./extra-context-client";

export type ContentDirectionsClientRequest = {
  domain: string;
  mode: "automatic" | "manual";
  topic?: string;
  topicCategory?: TopicCategoryId;
  extraContext?: ExtraContextInput;
  requestedVariations: 6;
  generationReason?: GenerationReason;
  parentGenerationId?: string;
  lockedMasterTopic?: string;
  selectedTopicContext?: SelectedTopicContext;
};

export type BuildRequestResult =
  | { ok: true; body: ContentDirectionsClientRequest }
  | { ok: false; error: string };

/**
 * Pure request builder used by the Marketing Topic hook (and tests).
 * Dashboard never invents evidence IDs; Brain owns that.
 */
export function buildContentDirectionsRequest(input: {
  domain: string;
  mode: "automatic" | "manual";
  topic?: string;
  topicCategory: TopicCategoryId | null;
  contextState: ExtraContextUiState;
  generationReason?: GenerationReason;
  parentGenerationId?: string;
  lockedMasterTopic?: string;
  selectedTopicContext?: SelectedTopicContext;
}): BuildRequestResult {
  const domain = input.domain.trim();
  if (!domain) {
    return { ok: false, error: "Add a brand website to unlock generation." };
  }

  const contextGate = canSubmitWithContext(input.contextState);
  if (!contextGate.ok) {
    return { ok: false, error: contextGate.error ?? "Invalid context" };
  }

  const extraContext = buildExtraContextPayload(input.contextState) ?? undefined;
  const reason = input.generationReason;
  const stc = input.selectedTopicContext;

  if (reason === "regenerate") {
    if (!input.lockedMasterTopic?.trim()) {
      return { ok: false, error: "Nothing to regenerate yet." };
    }
    return {
      ok: true,
      body: {
        domain,
        mode: input.mode,
        topic: input.lockedMasterTopic.trim(),
        lockedMasterTopic: input.lockedMasterTopic.trim(),
        generationReason: "regenerate",
        parentGenerationId: input.parentGenerationId,
        topicCategory: input.topicCategory ?? stc?.objective ?? undefined,
        extraContext,
        requestedVariations: 6,
        selectedTopicContext: stc,
      },
    };
  }

  if (stc) {
    return {
      ok: true,
      body: {
        domain,
        mode: input.mode,
        topic: stc.masterTitle,
        generationReason:
          reason ?? (input.mode === "manual" ? "manual" : "automatic"),
        topicCategory: input.topicCategory ?? stc.objective,
        extraContext,
        requestedVariations: 6,
        selectedTopicContext: stc,
      },
    };
  }

  if (input.mode === "manual" && !input.topic?.trim()) {
    return { ok: false, error: "Enter a topic to create directions." };
  }

  return {
    ok: true,
    body: {
      domain,
      mode: input.mode,
      topic: input.mode === "manual" ? input.topic!.trim() : undefined,
      generationReason: reason ?? (input.mode === "manual" ? "manual" : "automatic"),
      topicCategory: input.topicCategory ?? undefined,
      extraContext,
      requestedVariations: 6,
    },
  };
}
