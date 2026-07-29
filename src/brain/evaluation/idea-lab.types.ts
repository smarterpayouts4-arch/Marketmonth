import { DEFAULT_FIXTURE_NAME } from "@/brain/content/repository/default-fixture";
import type {
  DirectionWritingContext,
  ObjectiveFramingStrategy,
} from "@/brain/content/direction-writing-context";
import {
  DIRECTIONS_GENERATOR_VERSION,
  WRITING_CONTEXT_VERSION,
} from "@/brain/content/direction-writing-context";
import type { TopicCategoryId } from "@/brain/content/topic-category";
import { IDEA_LAB_DIRECTIONS_PROVIDER } from "@/brain/policy/provider-policy";

import type { IdeaLabRunEvaluation } from "./idea-quality.schema";
/** Leaf re-export — cycle-free (hook types does not import idea-lab.types). */
export { TOPIC_TITLE_HOOK_VERSION } from "./gtc/topic-title-hook/types";

export const IDEA_LAB_PROVIDER_ID = IDEA_LAB_DIRECTIONS_PROVIDER;
/** Generator copy path version (provider id stays deterministic-v1). */
export const IDEA_LAB_GENERATOR_VERSION = DIRECTIONS_GENERATOR_VERSION;
export const IDEA_LAB_WRITING_CONTEXT_VERSION = WRITING_CONTEXT_VERSION;
export const IDEA_LAB_FIXTURE_NAME = DEFAULT_FIXTURE_NAME;
export const IDEA_LAB_HISTORY_RELATIVE =
  "data/runtime/idea-lab-topic-history.csv";

export type IdeaLabDirectionLineage = {
  selectedTopicId: string;
  selectedMasterTitle: string;
  objective: TopicCategoryId;
  framingStrategy: ObjectiveFramingStrategy;
  fixtureHash: string;
  brandCoreId: string;
  writingContextVersion: typeof WRITING_CONTEXT_VERSION;
  directionWritingContext: DirectionWritingContext;
  providerUsed: typeof IDEA_LAB_PROVIDER_ID;
  generatorVersion: typeof IDEA_LAB_GENERATOR_VERSION;
  createdAt: string;
};

export type BrainTraceStatus = "success" | "warning" | "error" | "skipped";

export type BrainTraceStep = {
  step: number;
  stage: string;
  modulePath: string;
  symbol?: string;
  status: BrainTraceStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number | null;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  warnings?: string[];
};

/** Resolved evidence claim for Idea Lab Inspector (UI-safe; no gtc imports). */
export type IdeaLabEvidenceClaimView = {
  id: string;
  field: string;
  claim: string;
};

/** Lightweight candidate-generation trace surfaced in Test Inspector. */
export type IdeaLabCandidatesGenerationTrace = {
  evidenceIndexCount: number;
  evidenceSelectedCount: number;
  llmUsed: boolean;
  deterministicFallbackUsed: boolean;
  /** Runtime provenance: prompt-registry version consulted for this run. */
  promptVersion?: string;
  /** Model actually resolved for the LLM candidate stage. */
  model?: string;
  /** Wall-clock duration of the LLM candidate stage. */
  llmDurationMs?: number;
  /** Brand Core hash the run was grounded on. */
  artifactHash?: string;
  /** Correlates trace, result, and logs for one run (sessionId). */
  correlationId?: string;
  /** P3.1 prompt A/B arm this run was assigned ("control" | "b"). */
  promptVariant?: string;
  /** P3.1 LLM-as-judge sample (advisory; absent when not sampled). */
  judgeVersion?: string;
  judgeOverall?: number;
};

export type IdeaCandidateView = {
  id: string;
  angle: string;
  punchline: string;
  subheading: string;
  brief: string;
  ideaSummary?: string;
  audienceProblem?: string;
  strategicPurpose: string;
  specificTopic?: string;
  corePromise?: string;
  suggestedFormat?: string;
  suggestedCta?: string;
  evidenceIds: string[];
  assumptionIds: string[];
  confidence: string;
  safetyStatus: string;
  safetyReasons: string[];
};

export type InfluenceOrigin =
  | "csv_brand_profile"
  | "compiled_brand_core"
  | "derived_by_direction_generator"
  | "llm_generated"
  | "not_available"
  /** Compiled Brand Core but not primary idea-generation input (deterministic). */
  | "brand_core_compiled_not_consumed";

export type InfluenceItem = {
  key: string;
  value: string | string[] | number | boolean | null;
  origin: InfluenceOrigin;
  note?: string;
};

export type IdeaLabRun = {
  runId: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;

  input: {
    fixtureName: string;
    fixtureHash: string;
    providerRequested: typeof IDEA_LAB_PROVIDER_ID;
    providerUsed: typeof IDEA_LAB_PROVIDER_ID;
    generatorVersion: typeof IDEA_LAB_GENERATOR_VERSION;
    writingContextVersion?: typeof IDEA_LAB_WRITING_CONTEXT_VERSION;
    model: null;
    promptVersion: null;
    topicMode: "auto" | "manual";
    manualTopic?: string;
    historyRepositoryPath: string;
    labHistoryRecordCountBefore: number;
  };

  /** Reproducible directions lineage (no secrets). */
  directionLineage?: IdeaLabDirectionLineage;

  contextSummary: {
    brandName: string;
    website?: string;
    products: string[];
    services: string[];
    audiences: string[];
    contentOpportunities: string[];
    evidenceCount: number;
  };

  brandCoreSummary: {
    brandCoreId: string;
    brandCoreVersion: number;
    brandCoreHash: string;
    positioningSummary?: string;
    offers: string[];
    audiences: string[];
    proofCount: number;
    /** Honest: compiled for identity; not primary Directions idea input. */
    usedAsPrimaryIdeaInput: boolean;
  };

  generation: {
    masterTopic: string;
    masterTopicRationale: string | null;
    rationaleNote: string;
    ideas: IdeaCandidateView[];
  };

  influence: InfluenceItem[];
  trace: BrainTraceStep[];

  generationSucceeded: boolean;
  historyPersisted: boolean;
  persistenceError: string | null;
  historyWarning: string | null;

  warnings: string[];
  errors: string[];

  evaluation?: IdeaLabRunEvaluation;
};

export type IdeaLabInspectResult = {
  fixtureName: string;
  fixtureHash: string;
  rowCount: number;
  recordTypes: string[];
  brandFields: string[];
  evidenceCount: number;
  parseError: string | null;
  brandCoreId: string | null;
  brandCoreVersion: number | null;
  brandCoreHash: string | null;
  brandName: string | null;
  historyRepositoryPath: string;
  labHistoryRecordCount: number;
  productHistoryPath: string;
  providerStatus: {
    id: string;
    status: "active" | "unavailable_for_lab_baseline";
    label: string;
  }[];
};
