import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";
import type { ExtraContextInput, MarketingFocus } from "@/brain/content/types";
import type { TopicGenerationMode, TopicRunPurpose } from "@/brain/content/topic-generation-record";

export type DirectionProviderChoice = "deterministic-v1" | "intelligent-v1";

export type GenerateAndRecordContentDirectionsInput = {
  domain: string;
  mode: "automatic" | "manual";
  topic?: string;
  marketingFocus?: MarketingFocus | string;
  priorities?: string[];
  extraContext?: ExtraContextInput;
  requestedVariations?: number;
  /** Maps to TopicGenerationMode including regenerate / evaluation. */
  generationMode?: TopicGenerationMode;
  parentGenerationId?: string;
  lockedMasterTopic?: string;
  runPurpose?: TopicRunPurpose;
  comparisonGroupId?: string;
  experimentId?: string;
  fixturePath?: string;
  repository?: import("@/brain/store/topic-generation-repository").TopicGenerationRepository;
  /** Product default is deterministic-v1. */
  directionsProvider?: DirectionProviderChoice;
  /** Structured selected topic — masterTitle must not be trim-assigned. */
  selectedTopicContext?: SelectedTopicContext;
  /**
   * When Idea Lab (or another caller) already loaded Brand Core for this run,
   * pass context+identity to avoid a second fixture load/compile.
   */
  preloaded?: {
    context: import("@/brain/content/types").ContentBrainContext;
    identity: import("@/brain/core").BrandCoreIdentity;
  };
};

export type GenerateAndRecordContentDirectionsResult =
  | {
      ok: true;
      result: import("@/brain/content/types").ContentDirectionResult;
      generationId: string | null;
      brandCoreId: string;
      brandCoreVersion: number;
      brandCoreHash: string;
      similarTopicNotice: string | null;
      noveltyRecentCount: number;
      generationMode: TopicGenerationMode;
      provider: DirectionProviderChoice;
      source: "fixture" | "live";
      /** False when directions succeeded but experiment history was not written. */
      historyPersisted: boolean;
      historyError: string | null;
      validationOk: boolean | null;
      writingContext?: import("@/brain/content/direction-writing-context").DirectionWritingContext;
      selectedTopicContext?: SelectedTopicContext;
      /** Structured run trace (ContentRunTrace) for observability. */
      runTrace?: import("@/brain/contracts").ContentRunTrace;
    }
  | {
      ok: false;
      error: string;
      status?: number;
    };

export type ValidatedGenerateInput = {
  domain: string;
  mode: "automatic" | "manual";
  generationMode: TopicGenerationMode;
  directionsProvider: DirectionProviderChoice;
  selectedTopicContext?: SelectedTopicContext;
  topic?: string;
  lockedMasterTopic?: string;
  priorities?: string[];
  marketingFocus?: MarketingFocus;
  extraContext?: ExtraContextInput;
  requestedVariations: number;
  parentGenerationId?: string;
  runPurpose?: TopicRunPurpose;
  comparisonGroupId?: string;
  experimentId?: string;
  fixturePath?: string;
  repository?: import("@/brain/store/topic-generation-repository").TopicGenerationRepository;
};
