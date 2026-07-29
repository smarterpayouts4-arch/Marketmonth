import type { SelectedTopicContext } from "./direction-writing-context";
import {
  enrichSixDirectionHooks,
  type HookEnrichmentApplyMeta,
  type HookEnrichmentProviderUsed,
} from "./hook-enrichment";
import type { TopicCategoryId } from "./topic-category";
import type { ContentBrainContext, ContentVariation } from "./types";

export type DirectionHookEnrichmentOutcome = {
  variations: [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];
  masterTitle: string;
  meta: HookEnrichmentApplyMeta;
};

/**
 * Post-provider Variable Reward polish. Never regenerates angles or masterTitle.
 * Fail-closed: if enrichment mutates masterTitle, caller should keep originals.
 */
export async function applyDirectionHookEnrichment(args: {
  variations: [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];
  lockedMasterTitle: string;
  objective: TopicCategoryId;
  context: ContentBrainContext;
  selectedTopicContext?: SelectedTopicContext;
  provider?: HookEnrichmentProviderUsed | "auto";
}): Promise<DirectionHookEnrichmentOutcome> {
  const enriched = await enrichSixDirectionHooks({
    variations: args.variations,
    masterTitle: args.lockedMasterTitle,
    objective: args.objective,
    context: args.context,
    selectedTopicContext: args.selectedTopicContext,
    provider: args.provider ?? "auto",
  });

  return {
    variations: enriched.variations,
    masterTitle: enriched.masterTitle,
    meta: enriched.meta,
  };
}
