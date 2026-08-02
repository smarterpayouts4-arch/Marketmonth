import { NextResponse } from "next/server";

import {
  youtubeShortDurableEditsSchema,
  youtubeShortSceneStructureActionSchema,
} from "@/brain/channels/youtube-short/youtube-short-draft";
import { patchYouTubeShortDurableEdits } from "@/brain/channels/youtube-short/youtube-short-service";
import { PLATFORM_REGISTRY } from "@/brain/content-studio";

import { requireProductionAuthContext } from "./auth-context";

/**
 * PATCH — durable Short edits into existing production bundle.
 * Body: {
 *   atomId,
 *   formatId: "youtube_short",
 *   edits?,              // sparse merge into existing durableEdits
 *   resetToGenerated?,   // clear all package + scene overrides
 *   resetSceneId?,       // clear one scene's sparse override only
 *   sceneStructure?,     // setCount | addScene | removeSceneId
 * }
 */
export async function PATCH(request: Request) {
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
    edits?: unknown;
    resetToGenerated?: boolean;
    resetSceneId?: string;
    sceneStructure?: unknown;
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
        error: "Only youtube_short durable edits are supported",
      },
      { status: 400 }
    );
  }

  const auth = await requireProductionAuthContext({
    request,
    atomId,
    rateLimitAction: "brain.content.production.patch",
  });
  if (!auth.ok) return auth.response;

  const { companyId } = auth;

  const resetToGenerated = Boolean(raw.resetToGenerated);
  const resetSceneId = raw.resetSceneId?.trim() || undefined;

  let edits;
  let sceneStructure;
  if (raw.sceneStructure != null) {
    const parsedStructure =
      youtubeShortSceneStructureActionSchema.safeParse(raw.sceneStructure);
    if (!parsedStructure.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid sceneStructure payload" },
        { status: 400 }
      );
    }
    sceneStructure = parsedStructure.data;
  } else if (!resetToGenerated && !resetSceneId) {
    const parsed = youtubeShortDurableEditsSchema.safeParse(raw.edits);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Invalid edits payload" },
        { status: 400 }
      );
    }
    edits = parsed.data;
  }

  const outcome = await patchYouTubeShortDurableEdits({
    atomId,
    companyIdHint: companyId,
    edits,
    resetToGenerated,
    resetSceneId,
    sceneStructure,
  });

  if (!outcome.ok) {
    return NextResponse.json(
      { ok: false, error: outcome.error },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    bundle: outcome.bundle,
    package: outcome.package,
    draft: outcome.draft,
    atom: outcome.atom,
    validation: outcome.validationReport,
    recordRevision: outcome.recordRevision,
    selectedSceneIdHint: outcome.selectedSceneIdHint,
    platforms: PLATFORM_REGISTRY,
  });
}
