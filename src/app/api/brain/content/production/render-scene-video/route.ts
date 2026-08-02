import { NextResponse } from "next/server";

import {
  clearYouTubeShortSavedSceneVideo,
  renderYouTubeShortSavedSceneVideo,
} from "@/brain/channels/youtube-short/youtube-short-service";
import { createAtomRepository } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";
/** Veo polls can exceed the default serverless budget. */
export const maxDuration = 300;

async function authorizeVideoRequest(input: {
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
        { ok: false, error: session.error, code: "short_video.unauthenticated" },
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
          code: "short_video.atom_not_found",
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
        { ok: false, error: access.error, code: "short_video.unauthenticated" },
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
 * POST — image-to-video for one saved YouTube Short scene.
 * Body: { atomId, formatId: "youtube_short", sceneId }
 * Uses durable saved still + motionPrompt (Veo action) only — no client prompt/image.
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
        code: "short_video.invalid_request",
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
        code: "short_video.invalid_request",
      },
      { status: 400 }
    );
  }

  if (raw.formatId != null && raw.formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short scene video is supported",
        code: "short_video.invalid_request",
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
        code: "short_video.invalid_request",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeVideoRequest({
    request,
    atomId,
    rateLimitName: "brain.content.production.render_scene_video",
  });
  if (!auth.ok) return auth.response;

  const outcome = await renderYouTubeShortSavedSceneVideo({
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
        video: outcome.video,
        bundle: outcome.bundle,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atomId: outcome.atomId,
    sceneId: outcome.sceneId,
    video: outcome.video,
    bundle: outcome.bundle,
    message: outcome.message,
    durationVerified: outcome.video.durationSeconds != null,
  });
}

/**
 * DELETE — clear persisted video for one saved YouTube Short scene.
 * Query: atomId, sceneId (+ optional formatId=youtube_short)
 */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const atomId = url.searchParams.get("atomId")?.trim() ?? "";
  const sceneId = url.searchParams.get("sceneId")?.trim() ?? "";
  const formatId = url.searchParams.get("formatId")?.trim();

  if (!atomId) {
    return NextResponse.json(
      {
        ok: false,
        error: "atomId is required",
        code: "short_video.invalid_request",
      },
      { status: 400 }
    );
  }
  if (!sceneId) {
    return NextResponse.json(
      {
        ok: false,
        error: "sceneId is required",
        code: "short_video.invalid_request",
      },
      { status: 400 }
    );
  }
  if (formatId != null && formatId !== "" && formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short scene video is supported",
        code: "short_video.invalid_request",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeVideoRequest({
    request,
    atomId,
    rateLimitName: "brain.content.production.clear_scene_video",
  });
  if (!auth.ok) return auth.response;

  const outcome = await clearYouTubeShortSavedSceneVideo({
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
        bundle: outcome.bundle,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atomId: outcome.atomId,
    sceneId: outcome.sceneId,
    bundle: outcome.bundle,
    message: outcome.message,
    storageDeleteAttempted: outcome.storageDeleteAttempted,
    storageDeleteOk: outcome.storageDeleteOk,
  });
}
