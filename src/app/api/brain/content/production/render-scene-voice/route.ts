import { NextResponse } from "next/server";

import {
  clearYouTubeShortSavedSceneVoice,
  renderYouTubeShortSavedSceneVoice,
} from "@/brain/channels/youtube-short/youtube-short-service";
import { createAtomRepository } from "@/brain/store";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

async function authorizeVoiceRequest(input: {
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
        { ok: false, error: session.error, code: "short_voice.unauthenticated" },
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
          code: "short_voice.atom_not_found",
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
        { ok: false, error: access.error, code: "short_voice.unauthenticated" },
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
 * POST — generate voiceover for one saved YouTube Short scene narration.
 * Body: { atomId, formatId: "youtube_short", sceneId }
 * Does not accept narration from the client (uses durable saved scene).
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
        code: "short_voice.invalid_request",
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
        code: "short_voice.invalid_request",
      },
      { status: 400 }
    );
  }

  if (raw.formatId != null && raw.formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short scene voice is supported",
        code: "short_voice.invalid_request",
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
        code: "short_voice.invalid_request",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeVoiceRequest({
    request,
    atomId,
    rateLimitName: "brain.content.production.render_scene_voice",
  });
  if (!auth.ok) return auth.response;

  const outcome = await renderYouTubeShortSavedSceneVoice({
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
        voice: outcome.voice,
        bundle: outcome.bundle,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atomId: outcome.atomId,
    sceneId: outcome.sceneId,
    voice: outcome.voice,
    bundle: outcome.bundle,
    message: outcome.message,
    durationVerified: outcome.voice.durationSeconds != null,
  });
}

/**
 * DELETE — clear persisted voice for one saved YouTube Short scene.
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
        code: "short_voice.invalid_request",
      },
      { status: 400 }
    );
  }
  if (!sceneId) {
    return NextResponse.json(
      {
        ok: false,
        error: "sceneId is required",
        code: "short_voice.invalid_request",
      },
      { status: 400 }
    );
  }
  if (formatId != null && formatId !== "" && formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short scene voice is supported",
        code: "short_voice.invalid_request",
      },
      { status: 400 }
    );
  }

  const auth = await authorizeVoiceRequest({
    request,
    atomId,
    rateLimitName: "brain.content.production.clear_scene_voice",
  });
  if (!auth.ok) return auth.response;

  const outcome = await clearYouTubeShortSavedSceneVoice({
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
