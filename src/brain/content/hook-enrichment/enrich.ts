import type { TopicCategoryId } from "@/brain/content/topic-category";
import type {
  ContentBrainContext,
  ContentVariation,
} from "@/brain/content/types";
import type { SelectedTopicContext } from "@/brain/content/direction-writing-context";

import { enrichHookWithOpenAI } from "./openai-adapter";
import type {
  HookEnrichmentApplyMeta,
  HookEnrichmentProviderUsed,
  HookEnrichmentRequest,
  HookEnrichmentResult,
} from "./types";
import { HOOK_ENRICHMENT_VERSION } from "./types";
import { evidenceIdsSubset, validateHookEnrichment } from "./validate";

export type EnrichSixDirectionsInput = {
  variations: [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];
  masterTitle: string;
  objective: TopicCategoryId;
  context: ContentBrainContext;
  selectedTopicContext?: SelectedTopicContext;
  /**
   * openai — call cheapest model when key present; fallback per card.
   * deterministic-v1 — passthrough (default when disabled / no key).
   */
  provider?: HookEnrichmentProviderUsed | "auto";
};

export type EnrichSixDirectionsOutput = {
  variations: [
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
    ContentVariation,
  ];
  meta: HookEnrichmentApplyMeta;
  /** Byte-for-byte master title after enrichment (must match input). */
  masterTitle: string;
};

function resolveProvider(
  requested: HookEnrichmentProviderUsed | "auto" | undefined
): HookEnrichmentProviderUsed {
  if (requested === "deterministic-v1") return "deterministic-v1";
  if (requested === "openai") return "openai";
  // auto: openai only when explicitly enabled and key present
  const flag = process.env.HOOK_ENRICHMENT_PROVIDER?.trim().toLowerCase();
  if (flag === "openai" && process.env.OPENAI_API_KEY?.trim()) {
    return "openai";
  }
  return "deterministic-v1";
}

function allowedFactsFromContext(
  context: ContentBrainContext,
  selected?: SelectedTopicContext
): string[] {
  const facts: string[] = [];
  if (context.brandName) facts.push(context.brandName);
  if (context.valueProposition) facts.push(context.valueProposition);
  if (context.audience) facts.push(context.audience);
  for (const p of context.products.slice(0, 6)) facts.push(p);
  for (const c of (context.indexedProducts ?? []).slice(0, 4)) {
    facts.push(c.name);
  }
  for (const o of context.contentOpportunities.slice(0, 6)) facts.push(o);
  if (selected?.strategicAngle) facts.push(selected.strategicAngle);
  if (selected?.audiencePain) facts.push(selected.audiencePain);
  return facts.map((f) => f.trim()).filter(Boolean);
}

function groundedSummary(
  v: ContentVariation,
  selected?: SelectedTopicContext
): string {
  return [
    v.ideaSummary ?? v.brief,
    v.specificTopic,
    v.corePromise,
    selected?.strategicAngle,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);
}

function deterministicResult(originalHook: string): HookEnrichmentResult {
  return {
    hook: originalHook,
    enrichmentVersion: HOOK_ENRICHMENT_VERSION,
    providerUsed: "deterministic-v1",
  };
}

function applyCreativeFields(
  variation: ContentVariation,
  result: HookEnrichmentResult
): ContentVariation {
  // Only punchline (hook) + optional tension/payoff lines — never angle/evidence/subject
  let ideaSummary = variation.ideaSummary;
  if (result.tensionLine?.trim()) {
    const base = variation.ideaSummary ?? variation.brief;
    ideaSummary = `${result.tensionLine.trim()} ${base}`.trim().slice(0, 600);
  }
  let corePromise = variation.corePromise;
  if (result.payoffLine?.trim()) {
    corePromise = result.payoffLine.trim().slice(0, 160);
  }
  return {
    ...variation,
    punchline: result.hook.trim().slice(0, 90),
    ideaSummary,
    corePromise,
  };
}

/**
 * After deterministic six directions: polish hooks only.
 * Invalid AI output → keep that card's deterministic fields.
 * Never regenerates the whole direction set.
 */
export async function enrichSixDirectionHooks(
  input: EnrichSixDirectionsInput
): Promise<EnrichSixDirectionsOutput> {
  const masterTitle = input.masterTitle;
  const provider = resolveProvider(input.provider);
  const facts = allowedFactsFromContext(
    input.context,
    input.selectedTopicContext
  );

  let enrichedCount = 0;
  let fallbackCount = 0;
  let providerUsed: HookEnrichmentProviderUsed = "deterministic-v1";

  const out: ContentVariation[] = [];

  for (const variation of input.variations) {
    const groundedIds = [...variation.evidenceIds];
    const request: HookEnrichmentRequest = {
      masterTitle,
      objective: input.objective,
      angle: variation.angle,
      groundedSummary: groundedSummary(variation, input.selectedTopicContext),
      allowedFacts: facts,
      audienceLabel:
        input.selectedTopicContext?.audience?.trim() ||
        input.context.audience?.trim() ||
        "buyers",
      originalHook: variation.punchline,
    };

    let result = deterministicResult(variation.punchline);

    if (provider === "openai") {
      const ai = await enrichHookWithOpenAI(request);
      if (ai) {
        const check = validateHookEnrichment({
          request,
          result: ai,
          variation,
          masterTitle,
        });
        if (check.ok) {
          result = ai;
          providerUsed = "openai";
          enrichedCount += 1;
        } else {
          fallbackCount += 1;
        }
      } else {
        fallbackCount += 1;
      }
    }

    const next =
      result.providerUsed === "deterministic-v1"
        ? variation
        : applyCreativeFields(variation, result);

    if (!evidenceIdsSubset(next.evidenceIds, groundedIds)) {
      out.push(variation);
      fallbackCount += 1;
      continue;
    }
    // Angle and evidence must be identical references/values
    if (
      next.angle !== variation.angle ||
      next.evidenceIds.join("|") !== variation.evidenceIds.join("|")
    ) {
      out.push(variation);
      fallbackCount += 1;
      continue;
    }
    out.push(next);
  }

  if (provider === "deterministic-v1") {
    fallbackCount = 0;
    enrichedCount = 0;
  }

  return {
    variations: out as EnrichSixDirectionsOutput["variations"],
    masterTitle,
    meta: {
      enrichmentVersion: HOOK_ENRICHMENT_VERSION,
      providerUsed,
      enrichedCount,
      fallbackCount,
    },
  };
}
