import { NextResponse } from "next/server";

import { renderYouTubeShortSavedSceneComposedVideo } from "@/brain/channels/youtube-short/youtube-short-service";
import { createAtomRepository } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";
/** Local FFmpeg compose can exceed the default serverless budget. */
export const maxDuration = 300;

async function authorizeComposeRequest(input: {
  request: Request;
  atomId: string;
  rateLimitName: string;
}): Promise<
  | { ok: true; companyId: string }
  | { ok: false; response: NextResponse }
> {
  const session = await requireApiSession();
  if (!session.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: session.error,
          code: "short_compose.unauthenticated",
        },
        { status: session.status }
      ),
    };
  }

  const stored = await createAtomRepository().findLatestByAtomId(input.atomId);
  if (!stored) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: "Atom not found",
          code: "short_compose.atom_not_found",
        },
        { status: 404 }
      ),
    };
  }

  const companyId = stored.company_id;
  const access = await requireCompanyAccess(session.userId, companyId);
  if (!access.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          ok: false,
          error: access.error,
          code: "short_compose.unauthenticated",
        },
        { status: access.status }
      ),
    };
  }

  const rate = await enforceRateLimit(
    input.rateLimitName,
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId,
      request: input.request,
    })
  );
  if (!rate.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "Rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        }
      ),
    };
  }

  return { ok: true, companyId };
}

/**
 * POST — compose one saved YouTube Short scene into a 9:16 MP4
 * (still + static title + voice). Body: { atomId, formatId, sceneId }
 * Loads durable scene data only (no client media/text overrides).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: "Invalid JSON body",
        code: "short_compose.invalid_request",
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
        code: "short_compose.invalid_request",
      },
      { status: 400 }
    );
  }

  if (raw.formatId != null && raw.formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short scene composition is supported",
        code: "short_compose.invalid_request",
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
        code: "short_compose.invalid_request",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeComposeRequest({
    request,
    atomId,
    rateLimitName: "brain.content.production.render_scene_composed_video",
  });
  if (!auth.ok) return auth.response;

  const outcome = await renderYouTubeShortSavedSceneComposedVideo({
    atomId,
    formatId: "youtube_short",
    sceneId,
    companyIdHint: auth.companyId,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.error,
        code: outcome.code,
        composedVideo: outcome.composedVideo,
        bundle: outcome.bundle,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atomId: outcome.atomId,
    sceneId: outcome.sceneId,
    composedVideo: outcome.composedVideo,
    bundle: outcome.bundle,
    message: outcome.message,
    durationVerified: outcome.composedVideo.durationSeconds != null,
  });
}
