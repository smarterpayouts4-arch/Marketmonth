import {
  buildDirectionWritingContext,
  type DirectionWritingContext,
  type SelectedTopicContext,
} from "../direction-writing-context";
import {
  DIRECTIONS_BRAIN_VERSION,
  DIRECTIONS_PROMPT_VERSION,
  DIRECTIONS_PROVIDER_ID,
} from "../topic-generation-record.schema";
import type {
  DirectionProvider,
  DirectionsProviderRequest,
} from "./types";
import { buildSixVariations } from "./deterministic/templates";

/**
 * Frozen baseline Directions provider (`deterministic-v1`).
 * Angle templates live in providers/deterministic/templates.ts.
 *
 * Automatic master topics: use buildAutomaticMasterFromCandidates (no placeholder).
 */
export const deterministicProvider: DirectionProvider = {
  id: "deterministic-v1",
  async generateDirections(input: DirectionsProviderRequest) {
    const writing =
      input.writingContext ??
      buildDirectionWritingContext({
        selected: input.selectedTopicContext ?? null,
        context: input.context,
        fallbackMasterTitle: input.masterTopic.punchline,
        fallbackObjective: input.marketingFocus,
      });

    const variations = buildSixVariations({
      context: input.context,
      masterTopic: input.masterTopic,
      writing,
      marketingFocus: input.marketingFocus ?? writing.objective,
    });

    const masterTopic =
      input.selectedTopicContext != null
        ? {
            ...input.masterTopic,
            punchline: input.selectedTopicContext.masterTitle,
          }
        : input.masterTopic;

    return {
      provenance: {
        provider_id: DIRECTIONS_PROVIDER_ID,
        brain_version: DIRECTIONS_BRAIN_VERSION,
        prompt_version: DIRECTIONS_PROMPT_VERSION,
        model: null,
      },
      masterTopic,
      variations,
    };
  },
};

export type { DirectionWritingContext, SelectedTopicContext };
