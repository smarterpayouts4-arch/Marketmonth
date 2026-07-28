import type { DirectionsBrandCoreSlice } from "@/brain/core";

import type {
  DirectionWritingContext,
  SelectedTopicContext,
} from "../direction-writing-context";
import type { MarketingFocus } from "../marketing-focus";
import type {
  ContentBrainContext,
  ContentVariation,
  MasterTopic,
} from "../types";

export type DirectionProviderId = "deterministic-v1" | "intelligent-v1";

export type DirectionsProviderProvenance = {
  provider_id: DirectionProviderId;
  brain_version: string;
  prompt_version: string | null;
  model: string | null;
};

export type DirectionsProviderRequest = {
  brandSlice: DirectionsBrandCoreSlice;
  /** Used by deterministic-v1 templates only. */
  context: ContentBrainContext;
  mode: "automatic" | "manual";
  masterTopic: MasterTopic;
  marketingFocus?: MarketingFocus;
  priorities?: string[];
  /** Structured Lab/product handoff — preferred over title-only meaning. */
  selectedTopicContext?: SelectedTopicContext;
  /** Pre-built writing context (Lab); provider must not mutate. */
  writingContext?: DirectionWritingContext;
};

export type DirectionsValidationReport = {
  validator_version: string;
  ok: boolean;
  errors: string[];
};

export type DirectionsSix = [
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
  ContentVariation,
];

export type DirectionsProviderResult = {
  provenance: DirectionsProviderProvenance;
  masterTopic: MasterTopic;
  /** Empty when invalid === true. */
  variations: DirectionsSix | [];
  /** Full validated (or failed) intelligent payload for experiment storage. */
  intelligentPayload?: unknown;
  validation?: DirectionsValidationReport;
  /** When true, generation must not enter selection UI; still persist as experiment. */
  invalid?: boolean;
};

export type DirectionProvider = {
  id: DirectionProviderId;
  generateDirections(
    input: DirectionsProviderRequest
  ): Promise<DirectionsProviderResult>;
};
