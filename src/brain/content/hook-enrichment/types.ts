import type { TopicCategoryId } from "@/brain/content/topic-category";
import type { ContentAngle } from "@/brain/content/types";

export const HOOK_ENRICHMENT_VERSION = "hook-enrichment-v1" as const;

/** Cheapest capable OpenAI model for creative hook polish only. */
export const DEFAULT_HOOK_ENRICHMENT_MODEL = "gpt-5-nano" as const;

export type HookEnrichmentProviderUsed = "deterministic-v1" | "openai";

export type HookEnrichmentRequest = {
  masterTitle: string;
  objective: TopicCategoryId;
  angle: ContentAngle;
  groundedSummary: string;
  allowedFacts: string[];
  audienceLabel: string;
  originalHook: string;
};

export type HookEnrichmentResult = {
  hook: string;
  tensionLine?: string;
  payoffLine?: string;
  enrichmentVersion: typeof HOOK_ENRICHMENT_VERSION;
  providerUsed: HookEnrichmentProviderUsed;
};

export type HookEnrichmentApplyMeta = {
  enrichmentVersion: typeof HOOK_ENRICHMENT_VERSION;
  providerUsed: HookEnrichmentProviderUsed;
  enrichedCount: number;
  fallbackCount: number;
};
