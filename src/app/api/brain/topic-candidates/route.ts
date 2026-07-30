import { NextResponse } from "next/server";

import { parseTopicCategory } from "@/brain/content/topic-category";
import { getBrandCoreRepository } from "@/brain/core";
import { generateTopicCandidates } from "@/brain/evaluation/generate-topic-candidates";
import {
  emitQualityAlerts,
  evaluateTopicGenerationQuality,
} from "@/brain/observability/quality-alert";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

type Body = {
  domain?: string;
  topicCategory?: string;
};

/**
 * Product topic-candidate entry — deterministic pipeline only.
 *
 * Unlike the Idea Lab dev sandbox, this route does NOT run the LLM candidate
 * stage (no evidence selection, no fetchLlmTopicCandidates); it calls
 * generateTopicCandidates directly, which uses the objective topic strategies.
 * Does not write history. No fixturePath override — product resolves the
 * approved artifact for the requested domain only.
 */
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
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

  const domain = body.domain?.trim();
  if (!domain) {
    return NextResponse.json(
      { ok: false, error: "domain is required" },
      { status: 400 }
    );
  }

  const access = await requireCompanyAccess(session.userId, domain);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.topic-candidates",
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId: domain,
      request,
    })
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

  const focusParsed = parseTopicCategory(body.topicCategory);
  if (!focusParsed.ok) {
    return NextResponse.json(
      { ok: false, error: focusParsed.error },
      { status: 400 }
    );
  }
  if (!focusParsed.value) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please select what you want this topic to accomplish.",
      },
      { status: 400 }
    );
  }

  let loaded;
  try {
    loaded = await getBrandCoreRepository().getBrandCoreAsync(domain);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Brand Core load failed",
      },
      { status: 500 }
    );
  }

  const result = generateTopicCandidates({
    context: loaded.context,
    objective: focusParsed.value,
    includeIndustryResearch: false,
  });

  // Quality-drop alerting (P3.1) — structured ops signal, never a failure.
  emitQualityAlerts(
    `product:${domain}:${focusParsed.value}`,
    evaluateTopicGenerationQuality({
      status: result.status,
      candidateCount:
        result.status === "success" ? result.candidates.length : 0,
    })
  );

  return NextResponse.json({
    ok: true,
    result,
    meta: {
      domain,
      topicCategory: focusParsed.value,
      brandCoreId: loaded.identity.company_id,
      brandCoreHash: loaded.identity.brand_core_hash,
      source: loaded.source,
    },
  });
}
