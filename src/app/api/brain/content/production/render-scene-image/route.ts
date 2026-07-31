import { NextResponse } from "next/server";

import { renderYouTubeShortSavedSceneImage } from "@/brain/channels/youtube-short/youtube-short-service";
import { createAtomRepository } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

/**
 * POST — dry-run / prepare render for one saved YouTube Short scene.
 * Body: { atomId, formatId: "youtube_short", sceneId }
 * Does not accept visual prompts from the client.
 */
export async function POST(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error, code: "short_render.unauthenticated" },
      { status: session.status }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
        code: "short_render.invalid_request",
      },
      { status: 400 }
    );
  }

  const raw = body as {
    atomId?: string;
    formatId?: string;
    sceneId?: string;
  };

  const atomId = raw.atomId?.trim();
  if (!atomId) {
    return NextResponse.json(
      {
        ok: false,
        error: "atomId is required",
        code: "short_render.invalid_request",
      },
      { status: 400 }
    );
  }

  if (raw.formatId != null && raw.formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short scene image render is supported",
        code: "short_render.invalid_request",
      },
      { status: 400 }
    );
  }

  const sceneId = raw.sceneId?.trim();
  if (!sceneId) {
    return NextResponse.json(
      {
        ok: false,
        error: "sceneId is required",
        code: "short_render.invalid_request",
      },
      { status: 400 }
    );
  }

  const stored = await createAtomRepository().findLatestByAtomId(atomId);
  if (!stored) {
    return NextResponse.json(
      {
        ok: false,
        error: "Atom not found",
        code: "short_render.atom_not_found",
      },
      { status: 404 }
    );
  }

  const companyId = stored.company_id;
  const access = await requireCompanyAccess(session.userId, companyId);
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error, code: "short_render.unauthenticated" },
      { status: access.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content.production.render_scene_image",
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

  const outcome = await renderYouTubeShortSavedSceneImage({
    atomId,
    formatId: "youtube_short",
    sceneId,
    companyIdHint: companyId,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.error,
        code: outcome.code,
        render: outcome.render,
        bundle: outcome.bundle,
      },
      { status: outcome.status }
    );
  }

  const liveSucceeded = outcome.render.status === "succeeded";
  return NextResponse.json({
    ok: true,
    atomId: outcome.atom.atom_id,
    sceneId: outcome.sceneId,
    render: outcome.render,
    bundle: outcome.bundle,
    mode: outcome.render.mode ?? "dry_run",
    message: liveSucceeded
      ? "Image generated"
      : "Renderer path verified — no image generated",
  });
}
