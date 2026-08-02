import { NextResponse } from "next/server";

import { assembleYouTubeShortFinal } from "@/brain/channels/youtube-short/youtube-short-service";

import { requireProductionAuthContext } from "../auth-context";

export const runtime = "nodejs";
/** Multi-scene FFmpeg concat can exceed the default serverless budget. */
export const maxDuration = 300;

/**
 * POST — assemble all ready scene composed MP4s into one final Short.
 * Body: { atomId, formatId?: "youtube_short" }
 * Label: Download for manual YouTube upload (not platform publishing).
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
        code: "short_assemble.invalid_request",
      },
      { status: 400 }
    );
  }

  const record =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const atomId =
    typeof record.atomId === "string" ? record.atomId.trim() : "";
  const formatId =
    typeof record.formatId === "string" ? record.formatId : "youtube_short";

  if (!atomId) {
    return NextResponse.json(
      {
        ok: false,
        error: "atomId is required",
        code: "short_assemble.invalid_request",
      },
      { status: 400 }
    );
  }
  if (formatId !== "youtube_short") {
    return NextResponse.json(
      {
        ok: false,
        error: "Only youtube_short final assembly is supported",
        code: "short_assemble.invalid_request",
      },
      { status: 400 }
    );
  }

  const auth = await requireProductionAuthContext({
    request,
    atomId,
    rateLimitAction: "brain.content.production.assemble_final_short",
  });
  if (!auth.ok) return auth.response;

  const outcome = await assembleYouTubeShortFinal({
    atomId,
    companyIdHint: auth.companyId,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.error,
        code: outcome.code,
        finalShort: outcome.finalShort,
        bundle: outcome.bundle,
        readyScenes: outcome.readyScenes,
        totalScenes: outcome.totalScenes,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    atomId: outcome.atomId,
    finalShort: outcome.finalShort,
    bundle: outcome.bundle,
    message: outcome.message,
    downloadLabel: "Download for manual YouTube upload",
  });
}
