import { NextResponse } from "next/server";

import type { TopicGenerationMode } from "@/brain/content/topic-generation-record";
import type { ExtraContextInput, MarketingFocus } from "@/brain/content/types";
import { generateAndRecordContentDirections } from "@/brain/use-cases/generate-content-directions";

export const runtime = "nodejs";

type Body = {
  domain?: string;
  mode?: "automatic" | "manual";
  topic?: string;
  marketingFocus?: MarketingFocus | string;
  priorities?: string[];
  extraContext?: ExtraContextInput;
  requestedVariations?: number;
  generationReason?: "manual" | "automatic" | "regenerate" | "evaluation";
  parentGenerationId?: string;
  lockedMasterTopic?: string;
  runPurpose?: "product" | "benchmark" | "prompt_experiment" | "model_experiment";
  comparisonGroupId?: string;
  experimentId?: string;
  /** Opt-in experiment provider. Default: deterministic-v1. */
  directionsProvider?: "deterministic-v1" | "intelligent-v1";
};

/**
 * Transport only: validate HTTP body → Brain use case → JSON response.
 * Does not load CSV, compile Brand Core, or write history.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const mode = body.mode === "manual" ? "manual" : "automatic";
  const generationMode: TopicGenerationMode =
    body.generationReason === "regenerate"
      ? "regenerate"
      : body.generationReason === "evaluation"
        ? "evaluation"
        : body.generationReason === "manual" || mode === "manual"
          ? "manual"
          : "automatic";

  const directionsProvider =
    body.directionsProvider === "intelligent-v1"
      ? "intelligent-v1"
      : "deterministic-v1";

  const outcome = await generateAndRecordContentDirections({
    domain: body.domain ?? "",
    mode,
    topic: body.topic,
    marketingFocus: body.marketingFocus,
    priorities: body.priorities,
    extraContext: body.extraContext,
    requestedVariations: body.requestedVariations,
    generationMode,
    parentGenerationId: body.parentGenerationId,
    lockedMasterTopic: body.lockedMasterTopic,
    runPurpose: body.runPurpose,
    comparisonGroupId: body.comparisonGroupId,
    experimentId: body.experimentId,
    directionsProvider,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error },
      { status: outcome.status ?? 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    result: outcome.result,
    meta: {
      source: outcome.source,
      provider: outcome.provider,
      mode:
        outcome.result.status === "blocked"
          ? outcome.result.mode
          : outcome.result.mode,
      domain: body.domain?.trim() ?? "",
      hasExtraContext: Boolean(body.extraContext),
      marketingFocus: body.marketingFocus ?? null,
      generationId: outcome.generationId,
      generationReason: outcome.generationMode,
      parentGenerationId: body.parentGenerationId ?? null,
      similarTopicNotice: outcome.similarTopicNotice,
      noveltyRecentCount: outcome.noveltyRecentCount,
      brandCoreId: outcome.brandCoreId,
      brandCoreVersion: outcome.brandCoreVersion,
      brandCoreHash: outcome.brandCoreHash,
      historyPersisted: outcome.historyPersisted,
      historyError: outcome.historyError,
      validationOk: outcome.validationOk,
    },
  });
}
