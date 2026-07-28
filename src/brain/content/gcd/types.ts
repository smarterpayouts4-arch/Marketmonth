import type { DirectionWritingContext, SelectedTopicContext } from "../direction-writing-context";
import type { HookEnrichmentApplyMeta } from "../hook-enrichment";
import type { DirectionsProviderProvenance, DirectionsValidationReport } from "../providers/types";
import type { ContentDirectionResult, MasterTopic } from "../types";

export type GenerateContentDirectionsBundle = {
  result: ContentDirectionResult;
  provenance: DirectionsProviderProvenance;
  intelligentPayload?: unknown;
  validation?: DirectionsValidationReport;
  /** Set when invalid intelligent run should still be persisted. */
  invalidGenerationId?: string;
  masterTopicForHistory?: MasterTopic;
  writingContext?: DirectionWritingContext;
  selectedTopicContext?: SelectedTopicContext;
  hookEnrichment?: HookEnrichmentApplyMeta;
};
