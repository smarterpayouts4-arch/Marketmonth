import { NextResponse } from "next/server";

import { ingestYouTubeShortScenePrompt } from "@/brain/channels/youtube-short/youtube-short-service";
import { createAtomRepository } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

/**
 * POST — extract scene fields from a pasted brief (no bundle mutation).
 * Body: { atomId, formatId: "youtube_short", sceneId, prompt }
 */
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const raw = body as {
    atomId?: string;
    formatId?: string;
    sceneId?: string;
    prompt?: string;
  };

  const atomId = raw.atomId?.trim();
  if (!atomId) {
    return NextResponse.json(
      { ok: false, error: "atomId is required" },
      { status: 400 }
    );
  }

  if (raw.formatId != null && raw.formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short scene prompt ingestion is supported",
      },
      { status: 400 }
    );
  }

  const sceneId = raw.sceneId?.trim();
  if (!sceneId) {
    return NextResponse.json(
      { ok: false, error: "sceneId is required" },
      { status: 400 }
    );
  }

  const prompt = typeof raw.prompt === "string" ? raw.prompt : "";
  if (!prompt.trim()) {
    return NextResponse.json(
      { ok: false, error: "prompt is required" },
      { status: 400 }
    );
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return NextResponse.json(
      { ok: false, error: "Atom not found" },
      { status: 404 }
    );
  }

  const companyId = stored.company_id;
  const access = await requireCompanyAccess(session.userId, companyId);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content.production.ingest_scene_prompt",
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId,
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

  const outcome = await ingestYouTubeShortScenePrompt({
    atomId,
    companyIdHint: companyId,
    sceneId,
    prompt,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error, model: outcome.model },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    sceneId: outcome.sceneId,
    extracted: outcome.extracted,
    repairUsed: outcome.repairUsed,
    model: outcome.model,
  });
}
