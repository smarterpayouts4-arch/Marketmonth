import { NextResponse } from "next/server";

import type { TopicGenerationMode } from "@/brain/content/topic-generation-record";
import type { ExtraContextInput, TopicCategoryId } from "@/brain/content/types";
import { createRunTraceRepository } from "@/brain/store";
import { generateAndRecordContentDirections } from "@/brain/use-cases/generate-content-directions";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { rateLimitKeyFromRequest } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

type Body = {
  domain?: string;
  mode?: "automatic" | "manual";
  topic?: string;
  topicCategory?: TopicCategoryId | string;
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
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content-directions",
    rateLimitKeyFromRequest(request)
  );
  if (!rate.ok) {
    return NextResponse.json(
      { ok: false, error: "Rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      }
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const requestedDomain = body.domain?.trim() ?? "";
  if (requestedDomain) {
    const access = await requireCompanyAccess(session.userId, requestedDomain);
    if (!access.ok) {
      return NextResponse.json(
        { ok: false, error: access.error },
        { status: access.status }
      );
    }
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
    topicCategory: body.topicCategory,
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

  // Durable trace (P2.1) — best effort; the response carries it either way.
  try {
    if (outcome.runTrace) {
      await createRunTraceRepository().save({
        trace: outcome.runTrace,
        companyId: outcome.brandCoreId,
      });
    }
  } catch (err) {
    console.warn(
      `[content-directions] run trace persist failed: ${err instanceof Error ? err.message : String(err)}`
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
      topicCategory: body.topicCategory ?? null,
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
    // Full run trace (stages, timings, provenance) — P1.2: the use case
    // always built this; the route used to drop it.
    runTrace: outcome.runTrace,
  });
}
