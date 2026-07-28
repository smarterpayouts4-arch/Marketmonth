import {
  buildDirectionWritingContext,
  type DirectionWritingContext,
  type SelectedTopicContext,
} from "../direction-writing-context";
import { shortHash } from "../evidence";
import { evaluateSafety, mergeSafety } from "../safety";
import type {
  ContentBrainContext,
  MasterTopic,
} from "../types";
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
import { clamp } from "./deterministic/text";

/**
 * Frozen baseline Directions provider (`deterministic-v1`).
 * Angle templates live in providers/deterministic/templates.ts.
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

    // Immutable inputs — do not mutate selectedTopicContext / writingContext
    const variations = buildSixVariations({
      context: input.context,
      masterTopic: input.masterTopic,
      writing,
      marketingFocus: input.marketingFocus ?? writing.objective,
    });

    // Preserve master punchline exactly when structured selection supplied
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

export function buildAutomaticMaster(
  context: ContentBrainContext,
  recentMasterTopics: string[] = []
): MasterTopic {
  const opportunity =
    context.marketingOpportunity?.trim() ||
    context.contentOpportunities[0]?.trim() ||
    "Clarify the lead offer";
  const candidates = [
    `How to make clearer marketing decisions with ${context.brandName}`,
    ...context.contentOpportunities
      .map((o) => o.trim())
      .filter(Boolean)
      .slice(0, 4)
      .map((o) => clamp(`${o} for ${context.brandName} buyers`, 90)),
    clamp(`What ${context.brandName} buyers should know about ${opportunity}`, 90),
  ];
  const recentKeys = new Set(
    recentMasterTopics.map((t) => t.trim().toLowerCase()).filter(Boolean)
  );
  const punchline =
    candidates.find((c) => !recentKeys.has(c.trim().toLowerCase())) ??
    candidates[0];
  const subheading = clamp(
    context.valueProposition?.trim() ||
      context.description?.trim() ||
      `A practical umbrella for ${context.brandName} content`,
    150
  );
  const ownerNote = context.ownerConfirmed?.text?.trim();
  const rationale = clamp(
    ownerNote
      ? `Derived from brand context: ${opportunity}. Owner-confirmed notes also shaped this umbrella. Six directions explore distinct concrete opportunities under it.`
      : `Derived from brand context: ${opportunity}. This master topic stays fixed while six directions explore distinct concrete opportunities.`,
    280
  );
  const evidenceIds = Object.keys(context.evidenceById).slice(0, 4);
  const safety = mergeSafety(
    evaluateSafety(punchline),
    evaluateSafety(subheading),
    evaluateSafety(rationale)
  );

  return {
    id: `master_${shortHash(`auto|${context.contextVersion}|${punchline}`)}`,
    source: "automatic",
    punchline,
    subheading,
    rationale,
    evidenceIds,
    confidence: evidenceIds.length >= 2 ? "high" : "medium",
    safety,
  };
}

// Re-export for tests that deep-freeze writing context through provider
export type { DirectionWritingContext, SelectedTopicContext };
