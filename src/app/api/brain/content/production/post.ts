import { NextResponse } from "next/server";

import { PLATFORM_REGISTRY } from "@/brain/content-studio";
import type { ContentFormatId } from "@/brain/content-studio";
import { produceContentBundle } from "@/brain/use-cases/produce-content-bundle";

import { requireProductionAuthContext } from "./auth-context";

const FORMAT_IDS = new Set<ContentFormatId>([
  "youtube_short",
  "youtube_video",
]);

/**
 * POST — produce (or return idempotent) ContentProductionBundle.
 * Body: { atomId, formatIds?, forceRegenerate? }
 */
export async function POST(request: Request) {
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

  const auth = await requireProductionAuthContext({
    request,
    atomId,
    rateLimitAction: "brain.content.production",
  });
  if (!auth.ok) return auth.response;

  const { companyId } = auth;

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
