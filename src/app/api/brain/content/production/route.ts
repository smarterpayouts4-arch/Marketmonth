import { NextResponse } from "next/server";

import {
  youtubeShortDurableEditsSchema,
  youtubeShortSceneStructureActionSchema,
} from "@/brain/channels/youtube-short/youtube-short-draft";
import { patchYouTubeShortDurableEdits } from "@/brain/channels/youtube-short/youtube-short-service";
import { PLATFORM_REGISTRY } from "@/brain/content-studio";
import type { ContentFormatId } from "@/brain/content-studio";
import { createAtomRepository } from "@/brain/store";
import {
  getContentBundle,
  produceContentBundle,
} from "@/brain/use-cases/produce-content-bundle";
import { requireCompanyAccess } from "@/lib/auth/company-access";
import { requireApiSession } from "@/lib/auth/require-api-session";
import { enforceRateLimit } from "@/lib/http/durable-rate-limit";
import { tenantScopedRateLimitKey } from "@/lib/http/rate-limit";

export const runtime = "nodejs";

const FORMAT_IDS = new Set<ContentFormatId>([
  "youtube_short",
  "youtube_video",
]);

/**
 * GET — return existing production bundle for atomId (no generation).
 * Auth via atom owner companyId from store.
 */
export async function GET(request: Request) {
  const session = await requireApiSession();
  if (!session.ok) {
    return NextResponse.json(
      { ok: false, error: session.error },
      { status: session.status }
    );
  }

  const url = new URL(request.url);
  const atomId = url.searchParams.get("atomId")?.trim();
  if (!atomId) {
    return NextResponse.json(
      { ok: false, error: "atomId is required" },
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

  const access = await requireCompanyAccess(
    session.userId,
    stored.company_id
  );
  if (!access.ok) {
    return NextResponse.json(
      { ok: false, error: access.error },
      { status: access.status }
    );
  }

  const rate = await enforceRateLimit(
    "brain.content.production.get",
    tenantScopedRateLimitKey({
      userId: session.userId,
      companyId: stored.company_id,
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

  const outcome = await getContentBundle({ atomId });
  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.error,
        atom: outcome.atom,
        validation: outcome.validationReport ?? null,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    bundle: outcome.bundle,
    atom: outcome.atom,
    validation: outcome.validationReport,
    recordRevision: outcome.recordRevision,
    warnings: outcome.warnings,
    loadedExisting: true,
    platforms: PLATFORM_REGISTRY,
  });
}

/**
 * POST — produce (or return idempotent) ContentProductionBundle.
 * Body: { atomId, formatIds?, forceRegenerate? }
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
    formatIds?: string[];
    forceRegenerate?: boolean;
  };

  const atomId = raw.atomId?.trim();
  if (!atomId) {
    return NextResponse.json(
      { ok: false, error: "atomId is required" },
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
    "brain.content.production",
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

  let formatIds: ContentFormatId[] | undefined;
  if (Array.isArray(raw.formatIds) && raw.formatIds.length > 0) {
    formatIds = raw.formatIds.filter((id): id is ContentFormatId =>
      FORMAT_IDS.has(id as ContentFormatId)
    );
  }

  const outcome = await produceContentBundle({
    atomId,
    companyIdHint: companyId,
    formatIds,
    forceRegenerate: Boolean(raw.forceRegenerate),
  });

  if (!outcome.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: outcome.error,
        atom: outcome.atom,
        validation: outcome.validationReport ?? null,
      },
      { status: outcome.status }
    );
  }

  return NextResponse.json({
    ok: true,
    bundle: outcome.bundle,
    atom: outcome.atom,
    validation: outcome.validationReport,
    recordRevision: outcome.recordRevision,
    warnings: outcome.warnings,
    loadedExisting: outcome.loadedExisting,
    platforms: PLATFORM_REGISTRY,
  });
}

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
    "brain.content.production.patch",
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
